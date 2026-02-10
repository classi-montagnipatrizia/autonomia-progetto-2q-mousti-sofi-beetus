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
public class PostDettaglioResponseDTO {
    private Long id;
    private UserSummaryDTO autore;
    private String contenuto;
    private String imageUrl;
    private Integer likesCount;
    private Integer commentsCount;
    private Boolean hasLiked;
    private List<CommentResponseDTO> commenti;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}