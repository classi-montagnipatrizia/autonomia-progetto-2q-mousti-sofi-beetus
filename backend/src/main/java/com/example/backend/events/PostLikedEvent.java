package com.example.backend.events;

import lombok.AllArgsConstructor;
import lombok.Getter;

/**
 * Evento pubblicato quando un post riceve o perde un like.
 * <p>
 * Questo evento viene usato per notificare via WebSocket tutti gli utenti
 * connessi che il contatore like di un post è cambiato, permettendo
 * l'aggiornamento in tempo reale.
 */
@Getter
@AllArgsConstructor
public class PostLikedEvent {
    /**
     * ID del post che ha ricevuto/perso il like
     */
    private final Long postId;
    
    /**
     * Nuovo conteggio dei like
     */
    private final int likesCount;
    
    /**
     * ID dell'utente che ha messo/tolto il like
     */
    private final Long userId;
    
    /**
     * true se il like è stato aggiunto, false se è stato rimosso
     */
    private final boolean liked;
}
