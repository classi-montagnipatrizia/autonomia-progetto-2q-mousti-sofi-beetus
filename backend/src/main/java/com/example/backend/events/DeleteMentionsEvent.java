package com.example.backend.events;

import com.example.backend.models.MentionableType;
import lombok.AllArgsConstructor;
import lombok.Getter;

/**
 * Evento pubblicato quando un contenuto viene eliminato e le sue menzioni devono essere rimosse.
 * <p>
 * Viene gestito da un listener che elimina tutte le menzioni associate
 * al contenuto eliminato.
 * <p>
 * Questo può essere gestito in modo asincrono perché:
 * - L'eliminazione delle menzioni non deve bloccare la transazione principale
 * - Se l'eliminazione fallisce, le menzioni rimangono ma il contenuto è già marcato come eliminato
 * - Migliora le performance dell'operazione di eliminazione
 */
@Getter
@AllArgsConstructor
public class DeleteMentionsEvent {
    /**
     * Tipo di contenuto eliminato (POST o COMMENT)
     */
    private final MentionableType mentionableType;

    /**
     * ID del contenuto eliminato
     */
    private final Long mentionableId;
}
