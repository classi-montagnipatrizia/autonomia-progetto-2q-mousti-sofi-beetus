package com.example.backend.exception;

/**
 * Eccezione lanciata quando il token JWT non è valido
 */
public class InvalidTokenException extends ApplicationException {
    public InvalidTokenException(String message) {
        super(message);
    }
}