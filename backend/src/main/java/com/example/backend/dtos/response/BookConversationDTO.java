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
public class BookConversationDTO {
    private Long id;
    private BookSummaryDTO libro;
    private UserSummaryDTO altroUtente;
    private BookMessageDTO ultimoMessaggio;
    private Integer messaggiNonLetti;
    private LocalDateTime ultimaAttivita;
    private LocalDateTime createdAt;
}
