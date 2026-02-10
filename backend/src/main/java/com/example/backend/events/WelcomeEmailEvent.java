package com.example.backend.events;

import lombok.AllArgsConstructor;
import lombok.Getter;

/**
 * Evento pubblicato quando un nuovo utente si registra.
 * <p>
 * Viene gestito da un listener asincrono che invia l'email di benvenuto.
 * <p>
 * Vantaggi dell'approccio event-driven:
 * - La transazione di registrazione non viene bloccata dall'invio email
 * - Se l'invio email fallisce, la registrazione è comunque completata
 * 
 */
@Getter
@AllArgsConstructor
public class WelcomeEmailEvent {
    /**
     * Email del nuovo utente
     */
    private final String email;

    /**
     * Username del nuovo utente
     */
    private final String username;
}
