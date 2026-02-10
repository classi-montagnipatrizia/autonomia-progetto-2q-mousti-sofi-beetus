package com.example.backend.dtos.request;

import jakarta.validation.constraints.*;
import lombok.Data;

@Data
public class CreaCommentoRequestDTO {
    @NotBlank(message = "Contenuto del commento è obbligatorio")
    @Size(max = 2000, message = "Il commento non può superare 2000 caratteri")
    private String contenuto;

    private Long parentCommentId; // Null se è commento principale
}