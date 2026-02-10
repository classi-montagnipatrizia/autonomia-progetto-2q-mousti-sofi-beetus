package com.example.backend.dtos.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

/**
 * DTO per l'indicatore di digitazione tramite WebSocket.
 */
@Data
public class TypingIndicatorRequestDTO {

    @NotBlank(message = "Il username del destinatario è obbligatorio")
    private String recipientUsername;

    @NotNull(message = "Lo stato di digitazione è obbligatorio")
    private Boolean isTyping;
}
