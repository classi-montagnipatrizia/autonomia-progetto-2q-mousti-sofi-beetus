package com.example.backend.events;

import lombok.AllArgsConstructor;
import lombok.Getter;

/**
 * Evento pubblicato quando un post viene modificato.
 * <p>
 * Questo evento viene usato per notificare via WebSocket tutti gli utenti
 * connessi che un post è stato aggiornato, permettendo l'aggiornamento
 * in tempo reale del feed.
 */
@Getter
@AllArgsConstructor
public class PostUpdatedEvent {
    /**
     * ID del post modificato
     */
    private final Long postId;
}
