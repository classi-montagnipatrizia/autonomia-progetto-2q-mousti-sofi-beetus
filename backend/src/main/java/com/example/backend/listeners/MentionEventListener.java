package com.example.backend.listeners;

import com.example.backend.events.DeleteMentionsEvent;
import com.example.backend.events.MentionsToProcessEvent;
import com.example.backend.models.MentionableType;
import com.example.backend.services.MentionService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

/**
 * Listener per gli eventi relativi alle menzioni.
 * <p>
 * Questo componente gestisce il processing asincrono delle menzioni (@username)
 * in risposta agli eventi del sistema.
 * <p>
 * Il processing delle menzioni include:
 * - Estrazione degli @username dal contenuto
 * - Validazione degli username esistenti
 * - Creazione dei record nel database
 * - Invio di notifiche agli utenti menzionati
 * <p>
 * Usa @TransactionalEventListener con AFTER_COMMIT per garantire che
 * il contenuto sia già stato salvato nel database prima di processarlo.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class MentionEventListener {

    private final MentionService mentionService;

    /**
     * Gestisce il processing delle menzioni quando viene creato o modificato un contenuto.
     * <p>
     * Questo listener:
     * 1. Attende che la transazione sia committata (AFTER_COMMIT)
     * 2. Viene eseguito in modo asincrono (grazie a @Async)
     * 3. Chiama MentionService per processare le menzioni
     * 4. Se è un aggiornamento, prima elimina le vecchie menzioni
     * <p>
     * Vantaggi:
     * - Il contenuto esiste già nel database quando il listener viene eseguito
     * - La transazione originale (creazione post/commento) non viene bloccata
     * - Il parsing del contenuto e le notifiche avvengono in background
     * - Eventuali errori non compromettono la creazione del contenuto
     *
     * @param event L'evento contenente i dati del contenuto da processare
     */
    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void handleMentionsToProcess(MentionsToProcessEvent event) {
        log.info("Evento MentionsToProcessEvent ricevuto - Tipo: {}, ID: {}, Update: {}",
                event.getMentionableType(), event.getMentionableId(), event.isUpdate());

        try {
            if (event.isUpdate()) {
                // Se è un aggiornamento, prima elimina le vecchie menzioni
                log.debug("Aggiornamento menzioni per {} ID: {}",
                        event.getMentionableType(), event.getMentionableId());

                mentionService.aggiornaMenzioni(
                        event.getMentionableType(),
                        event.getMentionableId(),
                        event.getContent(),
                        event.getAuthorId()
                );
            } else {
                // Nuova creazione, processa normalmente
                log.debug("Processing nuove menzioni per {} ID: {}",
                        event.getMentionableType(), event.getMentionableId());

                if (event.getMentionableType() == MentionableType.POST) {
                    mentionService.processaMenzioniPost(
                            event.getMentionableId(),
                            event.getContent(),
                            event.getAuthorId()
                    );
                } else if (event.getMentionableType() == MentionableType.COMMENT) {
                    mentionService.processaMenzioniCommento(
                            event.getMentionableId(),
                            event.getContent(),
                            event.getAuthorId()
                    );
                }
            }

            log.info("Menzioni processate con successo per {} ID: {}",
                    event.getMentionableType(), event.getMentionableId());
        } catch (Exception e) {
            // Log ma non propagare l'errore
            // Il post/commento è già stato creato, le menzioni sono "best effort"
            log.error("Errore processing menzioni per {} ID: {} - Errore: {}",
                    event.getMentionableType(), event.getMentionableId(), e.getMessage(), e);
        }
    }

    /**
     * Gestisce l'eliminazione delle menzioni quando un contenuto viene eliminato.
     * <p>
     * Questo listener:
     * 1. Attende che la transazione sia committata (AFTER_COMMIT)
     * 2. Viene eseguito in modo asincrono (grazie a @Async)
     * 3. Elimina tutte le menzioni associate al contenuto eliminato
     * <p>
     * L'eliminazione asincrona garantisce che:
     * - L'eliminazione del contenuto è già stata committata
     * - La transazione di soft delete non viene bloccata
     * - Eventuali errori non compromettono l'eliminazione del contenuto
     *
     * @param event L'evento contenente i dati del contenuto eliminato
     */
    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void handleDeleteMentions(DeleteMentionsEvent event) {
        log.info("Evento DeleteMentionsEvent ricevuto - Tipo: {}, ID: {}",
                event.getMentionableType(), event.getMentionableId());

        try {
            mentionService.eliminaMenzioni(
                    event.getMentionableType(),
                    event.getMentionableId()
            );

            log.info("Menzioni eliminate con successo per {} ID: {}",
                    event.getMentionableType(), event.getMentionableId());
        } catch (Exception e) {
            // Log ma non propagare l'errore
            log.error("Errore eliminazione menzioni per {} ID: {} - Errore: {}",
                    event.getMentionableType(), event.getMentionableId(), e.getMessage(), e);
        }
    }
}
