package com.example.backend.dtos.request;

import jakarta.validation.constraints.*;
import lombok.Data;

@Data
public class InviaMessaggioRequestDTO {
    @NotNull(message = "ID destinatario è obbligatorio")
    private Long destinatarioId;

    @Size(max = 5000, message = "Il messaggio deve essere al massimo 5000 caratteri")
    private String contenuto;

    // URL immagine Cloudinary (opzionale)
    private String imageUrl;

    /**
     * Validazione: almeno uno tra contenuto e imageUrl deve essere presente
     */
    public boolean isValid() {
        boolean hasContent = contenuto != null && !contenuto.isBlank();
        boolean hasImage = imageUrl != null && !imageUrl.isBlank();
        return hasContent || hasImage;
    }
}