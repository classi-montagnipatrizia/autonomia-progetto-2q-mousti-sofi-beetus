package com.example.backend.events;

import lombok.AllArgsConstructor;
import lombok.Getter;

/**
 * Evento pubblicato quando un nuovo commento viene creato.
 * Usato per notificare via WebSocket tutti gli utenti che visualizzano il post.
 */
@Getter
@AllArgsConstructor
public class CommentCreatedEvent {
    /**
     * ID del post a cui appartiene il commento
     */
    private final Long postId;

    /**
     * ID del commento appena creato
     */
    private final Long commentId;

    /**
     * ID del commento padre (null se è un commento principale)
     */
    private final Long parentCommentId;
}
