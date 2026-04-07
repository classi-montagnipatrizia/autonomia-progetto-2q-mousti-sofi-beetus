package com.example.backend.listeners;

import com.example.backend.events.BookRequestedEvent;
import com.example.backend.services.NotificationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

@Component
@RequiredArgsConstructor
@Slf4j
public class BookEventListener {

    private final NotificationService notificationService;

    /**
     * Gestisce l'evento di richiesta libro dopo il commit della transazione.
     * Notifica il venditore che qualcuno ha richiesto il suo libro.
     */
    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void handleBookRequested(BookRequestedEvent event) {
        log.info("Evento BookRequestedEvent - Libro: {}, Richiedente: {}, Venditore: {}",
                event.getBookId(), event.getRequesterId(), event.getSellerId());
        try {
            notificationService.creaNotificaRichiestaLibro(
                    event.getSellerId(),
                    event.getRequesterId(),
                    event.getBookId()
            );
        } catch (Exception e) {
            log.error("Errore creazione notifica BOOK_REQUEST per libro {}: {}", event.getBookId(), e.getMessage());
        }
    }
}
