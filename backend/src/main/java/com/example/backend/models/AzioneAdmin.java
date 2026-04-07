package com.example.backend.models;

/**
 * Enum per i tipi di azioni amministrative
 */
public enum AzioneAdmin {
    // Gestione utenti
    ELIMINA_UTENTE,
    DISATTIVA_UTENTE,
    RIATTIVA_UTENTE,
    PROMUOVI_ADMIN,
    RIMUOVI_ADMIN,

    // Gestione contenuti
    ELIMINA_POST,
    ELIMINA_COMMENTO,
    ELIMINA_TUTTI_POST,
    ELIMINA_TUTTI_COMMENTI,

    // Gestione libri
    ELIMINA_ANNUNCIO,
    ELIMINA_TUTTI_ANNUNCI,

    // Gestione gruppi
    ELIMINA_GRUPPO,

    // Sistema
    PULIZIA_DATABASE,
    RESET_PASSWORD_UTENTE,
    VISUALIZZA_STATISTICHE
}