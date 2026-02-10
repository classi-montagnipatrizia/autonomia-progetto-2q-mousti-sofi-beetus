package com.example.backend.dtos.request;

import jakarta.validation.constraints.*;
import lombok.Data;

@Data
public class ConfermaResetPasswordRequestDTO {
    @NotBlank(message = "Token è obbligatorio")
    private String token;

    @NotBlank(message = "Nuova password è obbligatoria")
    @Size(min = 6, message = "Password deve essere almeno 6 caratteri")
    private String nuovaPassword;
}