package com.example.backend.config;

import com.example.backend.exception.ResourceNotFoundException;
import com.example.backend.models.User;
import com.example.backend.models.UserSession;
import com.example.backend.repositories.UserRepository;
import com.example.backend.repositories.UserSessionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.event.EventListener;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.socket.messaging.SessionConnectedEvent;
import org.springframework.web.socket.messaging.SessionDisconnectEvent;
import org.springframework.web.socket.messaging.SessionSubscribeEvent;
import org.springframework.web.socket.messaging.SessionUnsubscribeEvent;

import org.springframework.boot.context.event.ApplicationReadyEvent;

import java.security.Principal;
import java.time.LocalDateTime;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Set;

/**
 * Event Listener per tracciare connessioni e disconnessioni WebSocket.
 * <p>
 * Gestisce gli eventi del ciclo di vita delle sessioni WebSocket:
 * - CONNECT: Quando un client si connette
 * - SUBSCRIBE: Quando un client si sottoscrive a un topic/queue
 * - UNSUBSCRIBE: Quando un client si disiscrive
 * - DISCONNECT: Quando un client si disconnette
 * <p>
 * Mantiene una mappa in-memory degli utenti connessi per:
 * - Mostrare lo stato "online" nel frontend
 * - Statistiche di sistema
 * - Debug e monitoring
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class WebSocketSessionEventListener {

    private final UserSessionRepository userSessionRepository;
    private final UserRepository userRepository;
    private final SimpMessagingTemplate messagingTemplate;

    // Mappa bidirezionale per tracciare utenti connessi (O(1) lookup in entrambe le direzioni)
    private final Map<String, String> sessionToUsername = new ConcurrentHashMap<>();
    private final Map<String, Set<String>> usernameToSessions = new ConcurrentHashMap<>();

    @EventListener(ApplicationReadyEvent.class)
    @Transactional
    public void resetAllSessionsOnStartup() {
        long count = userSessionRepository.count();
        if (count > 0) {
            userSessionRepository.markAllOffline();
            log.info("Startup: marcate {} sessioni come offline", count);
        }
    }

    /**
     * Gestisce l'evento di connessione WebSocket.
     * <p>
     * Viene invocato quando un client stabilisce con successo
     * una connessione STOMP over WebSocket.
     * <p>
     * Aggiorna anche il database creando/aggiornando la UserSession.
     *
     * @param event L'evento di connessione
     */
    @EventListener
    public void handleWebSocketConnectListener(SessionConnectedEvent event) {
        StompHeaderAccessor headerAccessor = StompHeaderAccessor.wrap(event.getMessage());
        String sessionId = headerAccessor.getSessionId();
        Principal user = headerAccessor.getUser();

        if (user != null) {
            String username = user.getName();
            sessionToUsername.put(sessionId, username);
            usernameToSessions.computeIfAbsent(username, k -> ConcurrentHashMap.newKeySet()).add(sessionId);

            log.info("WebSocket Connected - User: {}, SessionId: {}", username, sessionId);
            log.debug("Utenti attualmente connessi: {}", usernameToSessions.size());

            // Aggiorna o crea UserSession nel database (con transazione separata)
            updateUserSessionOnConnect(username, sessionId);

            // Broadcast evento user online a tutti i client connessi (fuori dalla transazione)
            broadcastUserOnlineStatus(username, true);
        } else {
            log.warn("WebSocket Connected senza autenticazione - SessionId: {}", sessionId);
        }
    }

    /**
     * Aggiorna la sessione utente nel database quando si connette
     */
    private void updateUserSessionOnConnect(String username, String sessionId) {
        try {
            Optional<UserSession> existingSession = userSessionRepository.findBySessionId(sessionId);

            if (existingSession.isPresent()) {
                // Sessione già esistente, aggiorna
                UserSession session = existingSession.get();
                session.setIsOnline(true);
                session.setLastActivity(LocalDateTime.now());
                userSessionRepository.save(session);
                log.debug("UserSession aggiornata per {}", username);
            } else {
                // Nuova sessione, viene creata
                User userEntity = userRepository.findByUsernameAndIsActiveTrue(username)
                        .orElseThrow(() -> new ResourceNotFoundException("Utente attivo", "username", username));

                UserSession newSession = UserSession.builder()
                        .user(userEntity)
                        .sessionId(sessionId)
                        .isOnline(true)
                        .lastActivity(LocalDateTime.now())
                        .createdAt(LocalDateTime.now())
                        .build();

                userSessionRepository.save(newSession);
                log.info("Nuova UserSession creata per {} - SessionId: {}", username, sessionId);
            }
        } catch (Exception e) {
            log.error("Errore aggiornamento UserSession per {}: {}", username, e.getMessage());
        }
    }

    /**
     * Aggiorna la sessione utente nel database quando si disconnette
     */
    private void updateUserSessionOnDisconnect(String username, String sessionId) {
        try {
            Optional<UserSession> session = userSessionRepository.findBySessionId(sessionId);

            if (session.isPresent()) {
                UserSession userSession = session.get();
                userSession.setIsOnline(false);
                userSession.setLastActivity(LocalDateTime.now());
                userSessionRepository.save(userSession);
                log.info("UserSession marcata offline per {} - SessionId: {}", username, sessionId);
            } else {
                log.warn("UserSession non trovata per sessionId: {}", sessionId);
            }
        } catch (Exception e) {
            log.error("Errore aggiornamento UserSession offline per {}: {}", username, e.getMessage());
        }
    }

    /**
     * Gestisce l'evento di disconnessione WebSocket.
     * <p>
     * Viene invocato quando un client chiude la connessione
     * (volontariamente o per timeout/errore).
     * <p>
     * Rimuove l'utente dalla mappa in-memory e marca la sessione
     * come offline nel database.
     *
     * @param event L'evento di disconnessione
     */
    @EventListener
    public void handleWebSocketDisconnectListener(SessionDisconnectEvent event) {
        StompHeaderAccessor headerAccessor = StompHeaderAccessor.wrap(event.getMessage());
        String sessionId = headerAccessor.getSessionId();
        String username = sessionToUsername.remove(sessionId);

        if (username != null) {
            usernameToSessions.computeIfPresent(username, (k, sessions) -> {
                sessions.remove(sessionId);
                return sessions.isEmpty() ? null : sessions;
            });
            log.info("WebSocket Disconnected - User: {}, SessionId: {}", username, sessionId);
            log.debug("Utenti rimanenti connessi: {}", usernameToSessions.size());

            // Aggiorna UserSession nel database (con transazione separata)
            updateUserSessionOnDisconnect(username, sessionId);

            // Broadcast evento user offline a tutti i client connessi (fuori dalla transazione)
            broadcastUserOnlineStatus(username, false);
        } else {
            log.debug("WebSocket Disconnected - SessionId: {}", sessionId);
        }
    }

    /**
     * Gestisce l'evento di sottoscrizione a un topic/queue.
     * <p>
     * Viene invocato quando un client si sottoscrive a una destinazione
     * (es: /user/queue/notifications).
     * <p>
     * Utile per debug e monitoring.
     *
     * @param event L'evento di sottoscrizione
     */
    @EventListener
    public void handleSubscribeEvent(SessionSubscribeEvent event) {
        StompHeaderAccessor headerAccessor = StompHeaderAccessor.wrap(event.getMessage());
        Principal user = headerAccessor.getUser();
        String destination = headerAccessor.getDestination();

        if (user != null && destination != null) {
            log.debug("User {} subscribed to: {}", user.getName(), destination);
        }
    }

    /**
     * Gestisce l'evento di disiscrizione da un topic/queue.
     * <p>
     * Viene invocato quando un client si disiscreve da una destinazione.
     *
     * @param event L'evento di disiscrizione
     */
    @EventListener
    public void handleUnsubscribeEvent(SessionUnsubscribeEvent event) {
        StompHeaderAccessor headerAccessor = StompHeaderAccessor.wrap(event.getMessage());
        Principal user = headerAccessor.getUser();

        if (user != null) {
            log.debug("User {} unsubscribed from a destination", user.getName());
        }
    }

    /**
     * Verifica se un utente è attualmente connesso via WebSocket.
     * <p>
     * Utile per mostrare lo stato "online" nel frontend.
     *
     * @param username L'username da verificare
     * @return true se l'utente è connesso, false altrimenti
     */
    public boolean isUserConnected(String username) {
        return usernameToSessions.containsKey(username);
    }

    /**
     * Ottiene il numero di utenti attualmente connessi.
     *
     * @return Il numero di connessioni WebSocket attive
     */
    public int getActiveConnectionsCount() {
        return sessionToUsername.size();
    }

    /**
     * Ottiene la lista degli username degli utenti connessi.
     *
     * @return Set di username connessi
     */
    public Set<String> getActiveUsernames() {
        return new HashSet<>(usernameToSessions.keySet());
    }

    /**
     * Broadcast dell'evento di cambio stato online di un utente.
     * Invia solo ai compagni della stessa classe tramite il topic /topic/classroom/{classroom}/presence
     * e anche al topic globale per retrocompatibilità.
     *
     * @param username L'username dell'utente
     * @param isOnline true se online, false se offline
     */
    private void broadcastUserOnlineStatus(String username, boolean isOnline) {
        try {
            Optional<User> userOpt = userRepository.findByUsernameAndIsActiveTrue(username);

            if (userOpt.isPresent()) {
                User user = userOpt.get();

                // Gli admin sono invisibili: la loro presenza non viene mai broadcast
                if (Boolean.TRUE.equals(user.getIsAdmin())) {
                    log.debug("Admin user {}: presenza non trasmessa", username);
                    return;
                }

                String classroom = user.getClassroom();
                if (classroom == null || classroom.isEmpty()) {
                    log.debug("Utente {} senza classe: presenza non trasmessa", username);
                    return;
                }

                Map<String, Object> presenceEvent = new HashMap<>();
                presenceEvent.put("type", isOnline ? "user_online" : "user_offline");
                presenceEvent.put("userId", user.getId());
                presenceEvent.put("username", user.getUsername());
                presenceEvent.put("nomeCompleto", user.getFullName());
                presenceEvent.put("profilePictureUrl", user.getProfilePictureUrl());
                presenceEvent.put("isOnline", isOnline);
                presenceEvent.put("classroom", classroom);
                presenceEvent.put("timestamp", System.currentTimeMillis());

                // Broadcast solo al topic della classe: gli studenti vedono solo i propri compagni
                messagingTemplate.convertAndSend("/topic/classroom/" + classroom + "/presence", (Object) presenceEvent);
                log.debug("Broadcast user {} status: {} to classroom {}", username, isOnline ? "online" : "offline", classroom);
            }
        } catch (Exception e) {
            log.error("Errore durante broadcast presenza utente {}: {}", username, e.getMessage());
        }
    }
}
