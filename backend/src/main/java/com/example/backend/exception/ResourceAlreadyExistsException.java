package com.example.backend.exception;

/**
 * Eccezione lanciata quando si verifica un conflitto
 */
public class ResourceAlreadyExistsException extends ApplicationException {
    public ResourceAlreadyExistsException(String resourceName, String fieldName, Object fieldValue) {
        super(String.format("%s con %s '%s' esiste già", resourceName, fieldName, fieldValue));
    }

    public ResourceAlreadyExistsException(String message) {
        super(message);
    }
}