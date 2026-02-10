package com.example.backend.dtos.request;

import jakarta.validation.constraints.*;
import lombok.Data;

@Data
public class ResetPasswordRequestDTO {
    @NotBlank(message = "Email è obbligatoria")
    @Email(message = "Formato email non valido")
    private String email;
}