package com.example.backend.events;

import lombok.AllArgsConstructor;
import lombok.Getter;

/**
 * Evento pubblicato quando un post viene eliminato.
 * <p>
 * Questo evento viene usato per notificare via WebSocket tutti gli utenti
 * connessi che un post è stato eliminato, permettendo la rimozione
 * in tempo reale dal feed.
 */
@Getter
@AllArgsConstructor
public class PostDeletedEvent {
    /**
     * ID del post eliminato
     */
    private final Long postId;
}
