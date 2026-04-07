package com.example.backend.dtos.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class ChatbotRequestDTO {

    @NotBlank(message = "Il messaggio non può essere vuoto")
    @Size(max = 500, message = "Il messaggio non può superare 500 caratteri")
    private String messaggio;
}
