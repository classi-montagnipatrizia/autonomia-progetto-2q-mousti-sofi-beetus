package com.example.backend.models;

public enum NotificationType {
    MENTION,        // Menzione @username
    COMMENT,        // Commento su un post
    LIKE,           // Like su un post
    DIRECT_MESSAGE, // Messaggio diretto
    NEW_POST        // Nuovo post pubblicato
}
