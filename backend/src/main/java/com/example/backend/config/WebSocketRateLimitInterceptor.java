package com.example.backend.config;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import org.springframework.lang.NonNull;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.stereotype.Component;

import java.security.Principal;

/**
 * Interceptor per applicare rate limiting ai messaggi WebSocket.
 * <p>
 * Questo interceptor intercetta tutti i messaggi STOMP in arrivo e applica
 * rate limiting per prevenire:
 * - DoS attacks tramite flood di messaggi WebSocket
 * - Spam di typing indicators
 * - Abuse di messaggi real-time
 * <p>
 * Se il limite viene superato, il messaggio viene bloccato e non processato.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class WebSocketRateLimitInterceptor implements ChannelInterceptor {

    private final RateLimitService rateLimitService;

    @Override
    public Message<?> preSend(@NonNull Message<?> message,@NonNull MessageChannel channel) {
        StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);

        if (accessor != null && StompCommand.SEND.equals(accessor.getCommand())) {
            // Messaggio SEND da client - applica rate limiting
            Principal user = accessor.getUser();

            if (user != null) {
                String key = "ws-user:" + user.getName();
                String destination = accessor.getDestination();

                // Verifica rate limit
                if (!rateLimitService.tryConsume(key, RateLimitType.WEBSOCKET)) {
                    log.warn("WebSocket rate limit exceeded - User: {}, Destination: {}",
                            user.getName(), destination);

                    // Blocca il messaggio non restituendolo
                    // Il client non riceverà conferma e il messaggio non sarà processato
                    return null;
                }

                log.debug("WebSocket message allowed - User: {}, Destination: {}, Remaining tokens: {}",
                        user.getName(), destination,
                        rateLimitService.getAvailableTokens(key, RateLimitType.WEBSOCKET));
            } else {
                // Messaggio senza autenticazione - blocca per sicurezza
                log.warn("WebSocket message without authentication - blocking");
                return null;
            }
        }

        return message;
    }
}
