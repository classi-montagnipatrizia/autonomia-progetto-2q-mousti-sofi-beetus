package com.example.backend.events;

import com.example.backend.dtos.response.NotificationResponseDTO;
import lombok.AllArgsConstructor;
import lombok.Getter;

/**
 * Evento pubblicato quando una notifica viene creata.
 * <p>
 * Questo evento viene gestito da un listener che si occupa di inviare
 * la notifica via WebSocket all'utente destinatario.
 * <p>
 * Vantaggi:
 * - Disaccoppia NotificationService da WebSocketController
 * - Elimina la dipendenza circolare che richiedeva @Lazy
 * - Rende il sistema più modulare e testabile
 */
@Getter
@AllArgsConstructor
public class NotificationCreatedEvent {
    /**
     * Username dell'utente destinatario della notifica
     */
    private final String username;

    /**
     * DTO della notifica da inviare via WebSocket
     */
    private final NotificationResponseDTO notification;
}
