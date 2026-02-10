package com.example.backend.events;

import lombok.AllArgsConstructor;
import lombok.Getter;

/**
 * Evento pubblicato quando un nuovo post viene creato.
 * <p>
 * Questo evento viene gestito in modo asincrono da listener dedicati
 * per disaccoppiare la creazione del post dalle notifiche agli utenti.
 * <p>
 * Vantaggi:
 * - La transazione di creazione post non viene bloccata
 * - Le notifiche vengono processate in background
 * - Migliore performance e scalabilità
 */
@Getter
@AllArgsConstructor
public class PostCreatedEvent {
    /**
     * ID dell'autore del post
     */
    private final Long authorId;

    /**
     * ID del post appena creato
     */
    private final Long postId;
}
