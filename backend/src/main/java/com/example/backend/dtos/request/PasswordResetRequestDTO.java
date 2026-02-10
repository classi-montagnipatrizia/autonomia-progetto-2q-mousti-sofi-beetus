package com.example.backend.dtos.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DTO per richiedere il reset della password.
 * <p>
 * L'utente fornisce la propria email per ricevere
 * il link di reset password.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class PasswordResetRequestDTO {

    @NotBlank(message = "Email è obbligatoria")
    @Email(message = "Email non valida")
    private String email;
}
