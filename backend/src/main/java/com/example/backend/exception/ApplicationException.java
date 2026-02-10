package com.example.backend.exception;

/**
 * Eccezione base per tutte le eccezioni custom dell'applicazione
 */
public class ApplicationException extends RuntimeException {
    public ApplicationException(String message) {
        super(message);
    }

    public ApplicationException(String message, Throwable cause) {
        super(message, cause);
    }
}