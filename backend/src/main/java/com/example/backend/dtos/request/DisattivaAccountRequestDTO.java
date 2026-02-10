package com.example.backend.dtos.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

/**
 * DTO per la richiesta di disattivazione account.
 * Richiede la password dell'utente per confermare l'operazione.
 */
@Data
public class DisattivaAccountRequestDTO {

    @NotBlank(message = "La password è obbligatoria per disattivare l'account")
    private String password;
}
