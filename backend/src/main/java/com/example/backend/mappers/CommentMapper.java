package com.example.backend.mappers;

import com.example.backend.dtos.response.CommentResponseDTO;
import com.example.backend.models.Comment;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import java.util.stream.Collectors;

@Component
@RequiredArgsConstructor
public class CommentMapper {

    private final UserMapper userMapper;

    public CommentResponseDTO toCommentoResponseDTO(Comment comment) {
        if (comment == null) return null;

        return CommentResponseDTO.builder()
                .id(comment.getId())
                .autore(userMapper.toUtenteSummaryDTO(comment.getUser()))
                .contenuto(comment.getContent())
                .parentCommentId(comment.getParentComment() != null ?
                        comment.getParentComment().getId() : null)
                .risposte(comment.getChildComments().stream()
                        .filter(c -> !c.getIsDeletedByAuthor())
                        .map(this::toCommentoResponseDTO)
                        .collect(Collectors.toList()))
                .createdAt(comment.getCreatedAt())
                .updatedAt(comment.getUpdatedAt())
                .build();
    }

    /**
     * Converte un commento in DTO senza caricare le risposte.
     * Usato per broadcast WebSocket dove le risposte non sono necessarie.
     */
    public CommentResponseDTO toCommentoResponseDTOWithoutReplies(Comment comment) {
        if (comment == null) return null;

        return CommentResponseDTO.builder()
                .id(comment.getId())
                .autore(userMapper.toUtenteSummaryDTO(comment.getUser()))
                .contenuto(comment.getContent())
                .parentCommentId(comment.getParentComment() != null ?
                        comment.getParentComment().getId() : null)
                .risposte(java.util.Collections.emptyList())
                .createdAt(comment.getCreatedAt())
                .updatedAt(comment.getUpdatedAt())
                .build();
    }
}