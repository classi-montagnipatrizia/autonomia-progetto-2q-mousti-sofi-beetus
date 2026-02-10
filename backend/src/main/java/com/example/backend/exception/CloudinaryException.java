package com.example.backend.exception;

/**
 * Eccezione lanciata quando si verifica un errore durante operazioni Cloudinary
 */
public class CloudinaryException extends ApplicationException {
    public CloudinaryException(String message) {
        super(message);
    }

    public CloudinaryException(String message, Throwable cause) {
        super(message, cause);
    }
}
