package com.example.backend.events;

import com.example.backend.models.MentionableType;
import lombok.AllArgsConstructor;
import lombok.Getter;

/**
 * Evento pubblicato quando un contenuto con possibili menzioni viene creato o modificato.
 * <p>
 * Viene gestito da un listener asincrono che:
 * 1. Estrae le menzioni (@username) dal contenuto
 * 2. Crea i record nel database
 * 3. Invia notifiche agli utenti menzionati
 * <p>
 * Vantaggi dell'approccio asincrono:
 * - La transazione di creazione post/commento non viene bloccata
 * - Il parsing delle menzioni avviene in background
 * - Le notifiche non rallentano la risposta all'utente
 * - Migliore scalabilità con contenuti lunghi o molte menzioni
 */
@Getter
@AllArgsConstructor
public class MentionsToProcessEvent {
    /**
     * Tipo di contenuto che contiene le menzioni (POST o COMMENT)
     */
    private final MentionableType mentionableType;

    /**
     * ID del contenuto (post o commento)
     */
    private final Long mentionableId;

    /**
     * Contenuto testuale da analizzare per estrarre le menzioni
     */
    private final String content;

    /**
     * ID dell'autore che ha fatto le menzioni
     */
    private final Long authorId;

    /**
     * Flag che indica se si tratta di un aggiornamento (elimina vecchie menzioni prima)
     */
    private final boolean isUpdate;
}
