package com.example.backend.exception;

/**
 * Eccezione lanciata quando le credenziali di accesso non sono valide
 */
public class InvalidCredentialsException extends ApplicationException {
    public InvalidCredentialsException() {
        super("Username o password non corretti");
    }

    public InvalidCredentialsException(String message) {
        super(message);
    }
}