package com.example.backend.dtos.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

/**
 * DTO per la richiesta di cambio password.
 * Contiene la vecchia password per validazione e la nuova password.
 */
@Data
public class CambiaPasswordRequestDTO {

    @NotBlank(message = "La vecchia password è obbligatoria")
    private String vecchiaPassword;

    @NotBlank(message = "La nuova password è obbligatoria")
    @Size(min = 8, message = "La nuova password deve contenere almeno 8 caratteri")
    private String nuovaPassword;
}
