package com.example.backend.exception;

/**
 * Eccezione lanciata quando i dati di input non sono validi
 */
public class InvalidInputException extends ApplicationException {
    public InvalidInputException(String message) {
        super(message);
    }
}