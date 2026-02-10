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
public class PostResponseDTO {
    private Long id;
    private UserSummaryDTO autore;
    private String contenuto;
    private String imageUrl;
    private Integer likesCount;
    private Integer commentsCount;
    private Boolean hasLiked; // Se l'utente corrente ha messo like
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}