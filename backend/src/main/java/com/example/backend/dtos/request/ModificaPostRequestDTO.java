package com.example.backend.dtos.request;

import jakarta.validation.constraints.*;
import lombok.Data;

@Data
public class ModificaPostRequestDTO {
    @Size(max = 5000, message = "Il contenuto non può superare 5000 caratteri")
    private String contenuto;
}