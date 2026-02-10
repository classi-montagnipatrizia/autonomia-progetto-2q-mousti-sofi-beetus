package com.example.backend.dtos.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MessageResponseDTO {
    private Long id;
    private UserSummaryDTO mittente;
    private UserSummaryDTO destinatario;
    private String contenuto;
    private String imageUrl;
    private Boolean isRead;
    private Boolean isDeletedBySender;
    private Boolean isHiddenByCurrentUser;
    private LocalDateTime createdAt;
}
