package com.example.backend.dtos.request;

import jakarta.validation.constraints.*;
import lombok.Data;

@Data
public class CreaPostRequestDTO {
    @Size(max = 5000, message = "Il contenuto non può superare 5000 caratteri")
    private String contenuto;

    private String imageUrl; // URL da Firebase dopo upload

    // Validazione: almeno uno tra contenuto e imageUrl deve essere presente
    public boolean isValido() {
        return (contenuto != null && !contenuto.isBlank()) ||
                (imageUrl != null && !imageUrl.isBlank());
    }
}