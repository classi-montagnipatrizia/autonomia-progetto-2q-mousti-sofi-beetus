package com.example.backend.events;

import lombok.AllArgsConstructor;
import lombok.Getter;

/**
 * Evento pubblicato quando un commento viene modificato.
 * Usato per notificare via WebSocket tutti gli utenti che visualizzano il post.
 */
@Getter
@AllArgsConstructor
public class CommentUpdatedEvent {
    /**
     * ID del post a cui appartiene il commento
     */
    private final Long postId;

    /**
     * ID del commento modificato
     */
    private final Long commentId;
}
