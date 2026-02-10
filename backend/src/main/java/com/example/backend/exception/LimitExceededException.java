package com.example.backend.exception;

/**
 * Eccezione lanciata quando si supera un limite (es. numero massimo studenti)
 */
public class LimitExceededException extends ApplicationException {
    public LimitExceededException(String message) {
        super(message);
    }
}
