package com.example.backend.dtos.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

/**
 * DTO per messaggi di test WebSocket.
 */
@Data
public class WebSocketTestMessageDTO {

    @NotBlank(message = "Il contenuto del messaggio è obbligatorio")
    private String content;

    private String type;
}
