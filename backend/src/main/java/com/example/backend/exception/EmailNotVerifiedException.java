package com.example.backend.exception;

/**
 * Eccezione lanciata quando un utente tenta di accedere senza aver verificato la propria email
 */
public class EmailNotVerifiedException extends ApplicationException {
    public EmailNotVerifiedException(String message) {
        super(message);
    }
}
