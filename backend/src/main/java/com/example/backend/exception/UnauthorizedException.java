package com.example.backend.exception;

/**
 * Eccezione lanciata quando l'utente non ha i permessi per un'operazione
 */
public class UnauthorizedException extends ApplicationException {
    public UnauthorizedException(String message) {
        super(message);
    }

    public UnauthorizedException() {
        super("Non hai i permessi per eseguire questa operazione");
    }
}