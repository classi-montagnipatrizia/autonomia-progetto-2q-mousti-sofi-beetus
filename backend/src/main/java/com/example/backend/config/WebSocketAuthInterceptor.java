package com.example.backend.config;

import com.example.backend.security.JwtTokenProvider;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import org.springframework.lang.NonNull;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.stereotype.Component;

/**
 * Interceptor per autenticazione JWT nelle connessioni WebSocket.
 * <p>
 * Estrae il token JWT dall'handshake WebSocket e autentica l'utente
 * prima di permettere la connessione STOMP.
 * <p>
 * Il token può essere passato in due modi:
 * 1. Query parameter: ws://localhost:8080/ws?token=YOUR_JWT_TOKEN
 * 2. Header STOMP: Authentication: Bearer YOUR_JWT_TOKEN
 * <p>
 * Se il token è valido, l'utente viene autenticato e associato alla sessione WebSocket.
 * Tutti i messaggi successivi su quella sessione saranno autenticati.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class WebSocketAuthInterceptor implements ChannelInterceptor {

    private final JwtTokenProvider jwtTokenProvider;
    private final UserDetailsService userDetailsService;

    /**
     * Intercetta i messaggi prima che vengano processati.
     * <p>
     * Durante il comando CONNECT, estrae e valida il token JWT
     * per autenticare l'utente.
     *
     * @param message Il messaggio STOMP
     * @param channel Il canale di messaggistica
     * @return Il messaggio o null per bloccare
     */
    @Override
    public Message<?> preSend(@NonNull Message<?> message,@NonNull MessageChannel channel) {
        StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);

        if (accessor != null && StompCommand.CONNECT.equals(accessor.getCommand())) {
            log.debug("Rilevato comando CONNECT WebSocket");

            String token = extractToken(accessor);

            if (token != null) {
                try {
                    // Estrae username dal token
                    String username = jwtTokenProvider.extractUsername(token);
                    log.debug("Token JWT estratto per utente: {}", username);

                    // Carica i dettagli dell'utente
                    UserDetails userDetails = userDetailsService.loadUserByUsername(username);

                    // Verifica che il token sia valido
                    if (jwtTokenProvider.validateToken(token, userDetails)) {
                        // Crea autenticazione
                        UsernamePasswordAuthenticationToken authentication =
                                new UsernamePasswordAuthenticationToken(
                                        userDetails,
                                        null,
                                        userDetails.getAuthorities()
                                );

                        // Imposta l'utente nella sessione WebSocket
                        accessor.setUser(authentication);

                        // Imposta anche nel SecurityContext per questa operazione
                        SecurityContextHolder.getContext().setAuthentication(authentication);

                        log.info("Autenticazione WebSocket completata per utente: {}", username);

                        // Autenticazione riuscita - permetti connessione
                        return message;
                    } else {
                        log.warn("Token JWT non valido per WebSocket - connessione bloccata");
                        return null; // Blocca la connessione
                    }
                } catch (Exception e) {
                    log.error("Errore durante autenticazione WebSocket: {} - connessione bloccata", e.getMessage());
                    return null; // Blocca la connessione
                }
            } else {
                log.warn("Nessun token JWT trovato nella richiesta WebSocket - connessione bloccata");
                return null; // Blocca la connessione
            }
        }

        // Per tutti gli altri comandi (MESSAGE, SUBSCRIBE, etc.) permette se già connesso
        return message;
    }

    /**
     * Estrae il token JWT dall'accessor STOMP.
     * <p>
     * Cerca il token in:
     * 1. Native header "token" (query parameter nella connessione)
     * 2. Header "Authorization" con formato "Bearer TOKEN"
     *
     * @param accessor L'accessor STOMP contenente gli header
     * @return Il token JWT estratto, o null se non trovato
     */
    private String extractToken(StompHeaderAccessor accessor) {
        // Tenta di estrarre da query parameter (passato durante l'handshake)
        String token = accessor.getFirstNativeHeader("token");

        if (token != null && !token.isEmpty()) {
            log.debug("Token estratto da query parameter");
            return token;
        }

        // Tenta di estrarre da Authorization header
        String authHeader = accessor.getFirstNativeHeader("Authorization");
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            token = authHeader.substring(7);
            log.debug("Token estratto da Authorization header");
            return token;
        }

        return null;
    }
}
