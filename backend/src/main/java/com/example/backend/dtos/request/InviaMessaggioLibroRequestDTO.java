package com.example.backend.dtos.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class InviaMessaggioLibroRequestDTO {

    @NotBlank(message = "Il messaggio non può essere vuoto")
    @Size(max = 1000, message = "Il messaggio non può superare 1000 caratteri")
    private String contenuto;

    private Long conversationId;
}
