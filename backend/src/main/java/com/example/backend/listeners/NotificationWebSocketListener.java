package com.example.backend.listeners;

import com.example.backend.events.NotificationCreatedEvent;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

/**
 * Listener per gli eventi WebSocket.
 * <p>
 * Questo componente gestisce l'invio di notifiche real-time via WebSocket
 * in risposta agli eventi del sistema.
 * <p>
 * RISOLVE LA DIPENDENZA CIRCOLARE:
 * Prima: NotificationService → WebSocketController (con @Lazy)
 * Dopo: NotificationService → Event → WebSocketEventListener → SimpMessagingTemplate
 * <p>
 * Vantaggi:
 * - Nessuna dipendenza circolare
 * - Esecuzione asincrona (non blocca il thread principale)
 * - Disaccoppiamento completo tra business logic e layer di comunicazione
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class NotificationWebSocketListener {

    private final SimpMessagingTemplate messagingTemplate;

    /**
     * Gestisce l'invio di notifiche via WebSocket quando viene creata una notifica.
     * <p>
     * Questo listener:
     * 1. Attende che la transazione sia committata (AFTER_COMMIT)
     * 2. Viene eseguito in modo asincrono (grazie a @Async)
     * 3. Riceve l'evento con i dati della notifica
     * 4. Invia la notifica via WebSocket all'utente destinatario
     * <p>
     * Se l'invio fallisce (es. utente non connesso), l'errore viene loggato
     * ma non blocca il sistema. La notifica rimane comunque salvata nel DB.
     *
     * @param event L'evento contenente username e notifica da inviare
     */
    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void handleNotificationCreated(NotificationCreatedEvent event) {
        log.debug("Evento NotificationCreatedEvent ricevuto per utente: {}",
                event.getUsername());

        try {
            // Invia la notifica via WebSocket usando direttamente SimpMessagingTemplate
            messagingTemplate.convertAndSendToUser(
                    event.getUsername(),
                    "/queue/notifications",
                    event.getNotification()
            );

            log.debug("Notifica inviata via WebSocket a: {}", event.getUsername());
        } catch (Exception e) {
            // Log ma non propagare l'errore
            // La notifica è già salvata nel DB, il WebSocket è "best effort"
            log.warn("Errore invio notifica WebSocket a {}: {}",
                    event.getUsername(), e.getMessage());
        }
    }
}
