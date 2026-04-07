package com.example.backend.models;

public enum NotificationType {
    MENTION,        // Menzione @username
    COMMENT,        // Commento su un post
    LIKE,           // Like su un post
    DIRECT_MESSAGE, // Messaggio diretto
    NEW_POST,       // Nuovo post pubblicato
    BOOK_REQUEST,   // Qualcuno ha richiesto un tuo libro
    BOOK_MESSAGE,   // Nuovo messaggio nella chat libreria
    GROUP_MESSAGE,  // Nuovo messaggio in un gruppo
    GROUP_INVITE    // Sei stato aggiunto a un gruppo
}
