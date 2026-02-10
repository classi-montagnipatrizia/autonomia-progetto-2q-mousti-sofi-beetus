package com.example.backend.dtos.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DTO per confermare il reset della password.
 * <p>
 * L'utente fornisce il token ricevuto via email
 * e la nuova password da impostare.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class PasswordResetConfirmDTO {

    @NotBlank(message = "Token è obbligatorio")
    private String token;

    @NotBlank(message = "Nuova password è obbligatoria")
    @Size(min = 6, message = "La password deve essere di almeno 6 caratteri")
    private String newPassword;
}
