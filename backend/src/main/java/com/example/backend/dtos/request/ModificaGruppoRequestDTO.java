package com.example.backend.dtos.request;

import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class ModificaGruppoRequestDTO {

    @Size(max = 100, message = "Il nome non può superare 100 caratteri")
    private String nome;

    @Size(max = 500, message = "La descrizione non può superare 500 caratteri")
    private String descrizione;

    private String profilePictureUrl;
}
