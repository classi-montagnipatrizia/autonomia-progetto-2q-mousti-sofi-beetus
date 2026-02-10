package com.example.backend.controllers;

import com.example.backend.dtos.request.TypingIndicatorRequestDTO;
import com.example.backend.dtos.request.WebSocketTestMessageDTO;
import com.example.backend.models.User;
import com.example.backend.repositories.UserRepository;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;

import java.security.Principal;
import java.util.Map;
import java.util.Optional;

/**
 * Controller WebSocket per gestire messaggi real-time.
 * <p>
 * Gestisce:
 * - Messaggi inviati dai client tramite STOMP
 * - Invio di notifiche push agli utenti connessi
 * - Gestione degli stati di presenza (typing indicators, etc.)
 * <p>
 * Utilizza @MessageMapping per mappare i messaggi STOMP,
 * equivalente a @RequestMapping per HTTP REST.
 */
@Controller
@RequiredArgsConstructor
@Slf4j
public class WebSocketController {

    private final SimpMessagingTemplate messagingTemplate;
    private final UserRepository userRepository;

    /**
     * Gestisce messaggi di test inviati dai client.
     * <p>
     * Endpoint: /app/test
     * Il client può inviare un messaggio a questo endpoint per testare la connessione.
     * Il server risponde con un echo del messaggio ricevuto.
     *
     * @param message  Il payload del messaggio
     * @param headerAccessor Accessor per gli header del messaggio (include info utente)
     */
    @MessageMapping("/test")
    public void handleTestMessage(@Valid @Payload WebSocketTestMessageDTO request,
                                   SimpMessageHeaderAccessor headerAccessor) {
        Principal user = headerAccessor.getUser();
        String username = user != null ? user.getName() : "Anonymous";

        log.info("Messaggio test ricevuto da {}: {}", username, request.getContent());

        // Echo del messaggio al mittente
        messagingTemplate.convertAndSendToUser(
                username,
                "/queue/replies",
                Map.of(
                        "status", "received",
                        "message", "Test message received",
                        "content", request.getContent(),
                        "type", request.getType()
                )
        );
    }

    /**
     * Gestisce indicatori di digitazione per i messaggi diretti.
     * <p>
     * Endpoint: /app/typing
     * Quando un utente sta scrivendo un messaggio, il client invia
     * periodicamente questo evento per notificare il destinatario.
     * <p>
     * VALIDAZIONE:
     * - Verifica che il mittente sia autenticato
     * - Verifica che il destinatario esista nel database
     * - Verifica che il destinatario sia attivo
     * - Non invia se mittente = destinatario
     * <p>
     *
     *
     * @param request Il payload contenente il destinatario e lo stato
     * @param headerAccessor Accessor per identificare il mittente
     */
    @MessageMapping("/typing")
    public void handleTypingIndicator(@Valid @Payload TypingIndicatorRequestDTO request,
                                       SimpMessageHeaderAccessor headerAccessor) {
        Principal user = headerAccessor.getUser();
        if (user == null) {
            log.warn("Tentativo di invio typing indicator senza autenticazione");
            sendErrorToUser(null, "Non autenticato");
            return;
        }

        String senderUsername = user.getName();

        // Validazione: non inviare a se stesso
        if (senderUsername.equals(request.getRecipientUsername())) {
            log.warn("Utente {} tenta di inviare typing indicator a se stesso", senderUsername);
            sendErrorToUser(senderUsername, "Non puoi inviare typing indicator a te stesso");
            return;
        }

        //  Verifica che il destinatario esista e sia attivo
        Optional<User> recipientOpt = userRepository.findByUsernameAndIsActiveTrue(request.getRecipientUsername());

        if (recipientOpt.isEmpty()) {
            log.warn("Typing indicator: destinatario '{}' non trovato (richiesto da {})",
                    request.getRecipientUsername(), senderUsername);
            sendErrorToUser(senderUsername, "Destinatario non trovato: " + request.getRecipientUsername());
            return;
        }

        User recipient = recipientOpt.get();

        // Verifica che il destinatario sia attivo
        if (!recipient.getIsActive().booleanValue()) {
            log.warn("Typing indicator: destinatario '{}' non è attivo (richiesto da {})",
                    request.getRecipientUsername(), senderUsername);
            sendErrorToUser(senderUsername, "Destinatario non disponibile: " + request.getRecipientUsername());
            return;
        }

        log.debug("Typing indicator validato: {} -> {} (typing: {})",
                senderUsername, request.getRecipientUsername(), request.getIsTyping());

        // Invia l'indicatore al destinatario 
        messagingTemplate.convertAndSendToUser(
                request.getRecipientUsername(),
                "/queue/typing",
                Map.of(
                        "senderUsername", senderUsername,
                        "isTyping", request.getIsTyping()
                )
        );
    }

    /**
     * Invia una notifica real-time a un utente specifico.
     * <p>
     * Questo metodo è chiamato dal NotificationService quando viene creata
     * una nuova notifica. Non è un @MessageMapping perché viene chiamato
     * internamente dal server, non dai client.
     *
     * @param username L'username dell'utente destinatario
     * @param notification Il DTO della notifica da inviare
     */
    public void sendNotificationToUser(String username, Object notification) {
        log.debug("Invio notifica real-time a utente: {}", username);

        messagingTemplate.convertAndSendToUser(
                username,
                "/queue/notifications",
                notification
        );
    }

    /**
     * Invia una notifica di nuovo messaggio diretto a un utente.
     * <p>
     * Simile a sendNotificationToUser ma specifico per messaggi diretti.
     * Permette al frontend di distinguere tra notifiche generiche e messaggi.
     *
     * @param username L'username del destinatario
     * @param messageData I dati del messaggio
     */
    public void sendMessageNotificationToUser(String username, Object messageData) {
        log.debug("Invio notifica messaggio real-time a utente: {}", username);

        messagingTemplate.convertAndSendToUser(
                username,
                "/queue/messages",
                messageData
        );
    }

    /**
     * Invia una notifica broadcast a tutti gli utenti connessi.
     * <p>
     * Utilizzato per annunci di sistema o eventi globali.
     *
     * @param announcement Il messaggio da inviare a tutti
     */
    public void sendBroadcastAnnouncement(Map<String, Object> announcement) {
        log.info("Invio annuncio broadcast: {}", announcement);

        messagingTemplate.convertAndSend(
                "/topic/announcements",
                announcement
        );
    }

    /**
     * Invia un messaggio di errore a un utente specifico tramite WebSocket.
     * <p>
     * Questo metodo è utilizzato per comunicare errori di validazione o problemi
     * durante l'elaborazione di messaggi WebSocket, senza interrompere la connessione.
     * <p>
     * Il client dovrebbe sottoscriversi a /user/queue/errors per ricevere questi messaggi.
     *
     * @param username L'username del destinatario (null se non autenticato)
     * @param errorMessage Il messaggio di errore da inviare
     */
    private void sendErrorToUser(String username, String errorMessage) {
        if (username == null) {
            log.debug("Impossibile inviare errore a utente non autenticato: {}", errorMessage);
            return;
        }

        log.debug("Invio errore a {}: {}", username, errorMessage);

        messagingTemplate.convertAndSendToUser(
                username,
                "/queue/errors",
                Map.of(
                        "error", true,
                        "message", errorMessage,
                        "timestamp", System.currentTimeMillis()
                )
        );
    }
}
