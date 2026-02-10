package com.example.backend.dtos.request;

import jakarta.validation.constraints.*;
import lombok.Data;

@Data
public class RegistrazioneRequestDTO {
    @NotBlank(message = "Username è obbligatorio")
    @Size(min = 3, max = 50, message = "Username deve essere tra 3 e 50 caratteri")
    @Pattern(regexp = "^[a-zA-Z0-9_]+$", message = "Username può contenere solo lettere, numeri e underscore")
    private String username;

    @NotBlank(message = "Email è obbligatoria")
    @Email(message = "Formato email non valido")
    private String email;

    @NotBlank(message = "Password è obbligatoria")
    @Size(min = 8, max = 20, message = "Password deve essere tra 8 e 20 caratteri")
    @Pattern(regexp = "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d).*$", 
             message = "Password deve contenere almeno una lettera maiuscola, una minuscola e un numero")
    private String password;

    @NotBlank(message = "Nome completo è obbligatorio")
    @Size(max = 100)
    private String nomeCompleto;

    @NotBlank(message = "Classe è obbligatoria")
    @Size(max = 10, message = "Classe deve essere massimo 10 caratteri")
    private String classroom;
}