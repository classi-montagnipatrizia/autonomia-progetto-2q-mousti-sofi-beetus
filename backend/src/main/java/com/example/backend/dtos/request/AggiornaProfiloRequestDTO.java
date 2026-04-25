package com.example.backend.dtos.request;

import jakarta.validation.constraints.*;
import lombok.Data;

@Data
public class AggiornaProfiloRequestDTO {
    @Size(max = 100, message = "Nome completo non può superare 100 caratteri")
    private String nomeCompleto;

    @Size(max = 100, message = "Bio non può superare 100 caratteri")
    private String bio;

    @Size(max = 2048, message = "L'URL dell'immagine profilo non può superare 2048 caratteri")
    @Pattern(regexp = "^https://res\\.cloudinary\\.com/.*$",
             message = "L'immagine profilo deve essere caricata tramite il servizio di upload autorizzato")
    private String profilePictureUrl;
}