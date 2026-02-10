package com.example.backend.events;

import lombok.AllArgsConstructor;
import lombok.Getter;

/**
 * Evento pubblicato quando un commento viene eliminato.
 * Usato per notificare via WebSocket tutti gli utenti che visualizzano il post.
 */
@Getter
@AllArgsConstructor
public class CommentDeletedEvent {
    /**
     * ID del post a cui appartiene il commento
     */
    private final Long postId;

    /**
     * ID del commento eliminato
     */
    private final Long commentId;
}
