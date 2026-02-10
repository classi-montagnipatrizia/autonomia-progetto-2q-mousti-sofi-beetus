package com.example.backend.config;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.lang.NonNull;
import org.springframework.messaging.simp.config.ChannelRegistration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

import java.util.Arrays;

/**
 * Configurazione WebSocket per notifiche real-time.
 * <p>
 * Utilizza STOMP (Simple Text Oriented Messaging Protocol) over WebSocket
 * per fornire comunicazioni bidirezionali tra client e server.
 * <p>
 * Configurazione:
 * - Endpoint: /ws - Punto di connessione WebSocket (con fallback SockJS)
 * - Message Broker: /topic - Per messaggi broadcast a più utenti
 * - Application Destination: /app - Per messaggi inviati dal client al server
 * - User Destination: /user - Per messaggi diretti a utenti specifici
 * <p>
 * Esempi di utilizzo:
 * - Client si connette a: ws://localhost:8080/ws
 * - Client si sottoscrive a: /user/queue/notifications (notifiche personali)
 * - Server invia notifica a: /user/{username}/queue/notifications
 */
@Configuration
@EnableWebSocketMessageBroker
@RequiredArgsConstructor
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    private final WebSocketAuthInterceptor webSocketAuthInterceptor;
    private final WebSocketRateLimitInterceptor webSocketRateLimitInterceptor;

    @Value("${cors.allowed-origins}")
    private String allowedOrigins;

    /**
     * Configura il message broker.
     * <p>
     * - enableSimpleBroker: Abilita un broker in-memory semplice
     * con prefissi /topic (broadcast) e /user (messaggi diretti)
     * - setApplicationDestinationPrefixes: Imposta il prefisso per i messaggi
     * inviati dai client al server
     * - setUserDestinationPrefix: Imposta il prefisso per destinazioni
     * utente-specifiche
     *
     * @param config il registry del message broker
     */
    @Override
    public void configureMessageBroker(@NonNull MessageBrokerRegistry config) {
        // Abilita un simple broker in-memory per gestire le sottoscrizioni
        // /topic -> per messaggi broadcast a tutti gli utenti sottoscritti
        // /queue -> per messaggi diretti a specifici utenti
        config.enableSimpleBroker("/topic", "/queue");

        // Prefisso per i messaggi inviati dal client al server
        config.setApplicationDestinationPrefixes("/app");

        // Prefisso per le destinazioni user-specific
        config.setUserDestinationPrefix("/user");
    }

    /**
     * Registra gli endpoint STOMP per la connessione WebSocket.
     * <p>
     * - addEndpoint("/ws"): L'endpoint a cui i client si connettono
     * - setAllowedOrigins("http://localhost:4200"): Abilita CORS per il frontend
     * Angular
     * - withSockJS(): Abilita il fallback SockJS per browser che non supportano
     * WebSocket
     *
     * @param registry il registry degli endpoint STOMP
     */
    @Override
    public void registerStompEndpoints(@NonNull StompEndpointRegistry registry) {

        // Trim degli spazi bianchi da ogni origin e converti in array
        String[] origins = Arrays.stream(allowedOrigins.split(","))
                .map(String::trim)
                .toArray(String[]::new);

        // Registra l'endpoint /ws per connessioni WebSocket
        registry.addEndpoint("/ws")
                // Permetti connessioni dal frontend (da variabile d'ambiente)
                // setAllowedOriginPatterns per WebSocket accetta String[] o varargs
                .setAllowedOriginPatterns(origins)
                // Abilita SockJS come fallback per browser senza supporto WebSocket nativo
                .withSockJS();
    }

    /**
     * Configura gli interceptor per i canali in entrata.
     * <p>
     * Registra due interceptor in ordine:
     * 1. WebSocketAuthInterceptor - Autentica le connessioni tramite JWT
     * 2. WebSocketRateLimitInterceptor - Applica rate limiting ai messaggi
     * <p>
     * L'ordine è importante: prima autenticazione, poi rate limiting.
     *
     * @param registration La registrazione del canale
     */
    @Override
    public void configureClientInboundChannel(@NonNull ChannelRegistration registration) {
        registration.interceptors(
                webSocketAuthInterceptor,
                webSocketRateLimitInterceptor);
    }
}
