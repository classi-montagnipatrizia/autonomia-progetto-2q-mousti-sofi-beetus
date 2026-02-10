package com.example.backend.dtos.response;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CommentResponseDTO {
    private Long id;
    private UserSummaryDTO autore;
    private String contenuto;
    private Long parentCommentId;
    private List<CommentResponseDTO> risposte; // Commenti figli
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
