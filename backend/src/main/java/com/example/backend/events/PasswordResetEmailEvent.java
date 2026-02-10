package com.example.backend.events;

import lombok.AllArgsConstructor;
import lombok.Getter;

/**
 * Evento pubblicato quando un utente richiede il reset della password.
 * <p>
 * Viene gestito da un listener asincrono che invia l'email con il token di reset.
 * <p>
 * L'invio asincrono garantisce che:
 * - La risposta HTTP sia immediata
 * - Eventuali problemi SMTP non blocchino l'applicazione
 * - Il sistema sia più resiliente a picchi di traffico
 */
@Getter
@AllArgsConstructor
public class PasswordResetEmailEvent {
    /**
     * Email dell'utente
     */
    private final String email;

    /**
     * Username dell'utente
     */
    private final String username;

    /**
     * Token per il reset della password
     */
    private final String resetToken;
}
