package com.example.backend.exception;

/**
 * Eccezione lanciata quando si tenta di eseguire operazioni non permesse su account admin.
 * <p>
 * Esempi:
 * - Tentativo di disabilitare un account admin
 * - Tentativo di eliminare un account admin
 * - Tentativo di rimuovere privilegi admin dall'unico admin rimasto
 */
public class AdminProtectionException extends RuntimeException {

    public AdminProtectionException(String message) {
        super(message);
    }

    public AdminProtectionException(String message, Throwable cause) {
        super(message, cause);
    }
}
