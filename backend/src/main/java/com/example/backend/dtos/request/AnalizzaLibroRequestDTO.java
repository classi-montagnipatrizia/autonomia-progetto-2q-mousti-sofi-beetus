package com.example.backend.dtos.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class AnalizzaLibroRequestDTO {

    @NotBlank(message = "L'URL dell'immagine frontale è obbligatorio")
    private String frontImageUrl;

    private String backImageUrl; // opzionale
}
