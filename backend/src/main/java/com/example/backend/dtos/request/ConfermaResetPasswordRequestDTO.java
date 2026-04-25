package com.example.backend.dtos.request;

import jakarta.validation.constraints.*;
import lombok.Data;

@Data
public class ConfermaResetPasswordRequestDTO {
    @NotBlank(message = "Token è obbligatorio")
    private String token;

    @NotBlank(message = "Nuova password è obbligatoria")
    @Size(min = 8, max = 20, message = "Password deve essere tra 8 e 20 caratteri")
    @Pattern(regexp = "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d).*$",
             message = "Password deve contenere almeno una lettera maiuscola, una minuscola e un numero")
    private String nuovaPassword;
}