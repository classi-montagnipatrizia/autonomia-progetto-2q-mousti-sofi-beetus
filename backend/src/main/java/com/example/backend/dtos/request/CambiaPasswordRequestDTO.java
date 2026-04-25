package com.example.backend.dtos.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
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
    @Size(min = 8, max = 20, message = "La nuova password deve essere tra 8 e 20 caratteri")
    @Pattern(regexp = "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d).*$",
             message = "La nuova password deve contenere almeno una lettera maiuscola, una minuscola e un numero")
    private String nuovaPassword;
}
