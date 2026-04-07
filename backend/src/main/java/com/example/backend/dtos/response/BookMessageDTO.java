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
public class BookMessageDTO {
    private Long id;
    private Long conversationId; // utile al frontend dopo il primo messaggio (findOrCreate)
    private UserSummaryDTO mittente;
    private String contenuto;
    private Boolean isRead;
    private Boolean isDeletedBySender;
    private LocalDateTime createdAt;
}
