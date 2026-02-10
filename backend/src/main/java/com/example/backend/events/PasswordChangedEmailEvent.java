package com.example.backend.events;

import lombok.AllArgsConstructor;
import lombok.Getter;

/**
 * Evento pubblicato quando un utente cambia la propria password.
 * <p>
 * Viene gestito da un listener asincrono che invia l'email di conferma.
 * <p>
 * L'email serve come misura di sicurezza per notificare l'utente
 * di modifiche potenzialmente non autorizzate al proprio account.
 */
@Getter
@AllArgsConstructor
public class PasswordChangedEmailEvent {
    /**
     * Email dell'utente
     */
    private final String email;

    /**
     * Username dell'utente
     */
    private final String username;
}
