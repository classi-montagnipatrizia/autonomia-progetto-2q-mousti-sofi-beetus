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
public class ConversationResponseDTO {
    private UserSummaryDTO altroUtente;
    private MessageResponseDTO ultimoMessaggio;
    private Integer messaggiNonLetti;
    private LocalDateTime ultimaAttivita;
}
