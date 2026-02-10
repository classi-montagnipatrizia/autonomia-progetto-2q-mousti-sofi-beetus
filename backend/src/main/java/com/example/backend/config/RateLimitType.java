package com.example.backend.config;

/**
 * Tipi di rate limiting disponibili.
 * <p>
 * Ogni tipo definisce limiti diversi basati sull'operazione:
 * - AUTH: Login/registrazione (prevenire brute force)
 * - POST_CREATION: Creazione post/commenti (prevenire spam)
 * - LIKE: Like/unlike (prevenire abuse)
 * - MESSAGE: Messaggi diretti (prevenire spam)
 * - API_GENERAL: Limite generico per tutte le API
 */
public enum RateLimitType {
    /**
     * Rate limit per operazioni di autenticazione (login, registrazione).
     * Limite stringente per prevenire brute force attacks.
     * Default: 5 richieste per minuto
     */
    AUTH,

    /**
     * Rate limit per creazione di contenuti (post, commenti).
     * Previene spam di contenuti.
     * Default: 10 richieste per minuto
     */
    POST_CREATION,

    /**
     * Rate limit per operazioni di like/unlike.
     * Previene abuse del sistema di like.
     * Default: 30 richieste per minuto
     */
    LIKE,

    /**
     * Rate limit per messaggi diretti.
     * Previene spam di messaggi.
     * Default: 20 richieste per minuto
     */
    MESSAGE,

    /**
     * Rate limit generico per API.
     * Limite base per tutte le richieste API.
     * Default: 100 richieste per minuto
     */
    API_GENERAL,

    /**
     * Rate limit per operazioni WebSocket.
     * Previene DoS su connessioni real-time.
     * Default: 50 messaggi per minuto
     */
    WEBSOCKET
}
