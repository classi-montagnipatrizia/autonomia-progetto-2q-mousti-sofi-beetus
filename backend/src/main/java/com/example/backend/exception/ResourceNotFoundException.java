package com.example.backend.exception;

/**
 * Eccezione lanciata quando una risorsa non viene trovata
 */
public class ResourceNotFoundException extends ApplicationException {
    public ResourceNotFoundException(String resourceName, String fieldName, Object fieldValue) {
        // Non mostra l'ID per motivi di sicurezza
        super(String.format("%s non trovato", resourceName));
    }

    public ResourceNotFoundException(String message) {
        super(message);
    }
}