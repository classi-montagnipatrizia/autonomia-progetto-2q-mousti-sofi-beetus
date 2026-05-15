package com.example.backend.mappers;

import com.example.backend.dtos.response.CommentResponseDTO;
import com.example.backend.models.Comment;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import java.util.List;
import java.util.Set;
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
     * Overload batch-friendly: usa onlineUserIds precaricato per evitare query per commento.
     */
    public CommentResponseDTO toCommentoResponseDTO(Comment comment, Set<Long> onlineUserIds) {
        if (comment == null) return null;

        return CommentResponseDTO.builder()
                .id(comment.getId())
                .autore(userMapper.toUtenteSummaryDTO(comment.getUser(), onlineUserIds))
                .contenuto(comment.getContent())
                .parentCommentId(comment.getParentComment() != null ?
                        comment.getParentComment().getId() : null)
                .risposte(comment.getChildComments().stream()
                        .filter(c -> !c.getIsDeletedByAuthor())
                        .map(c -> toCommentoResponseDTO(c, onlineUserIds))
                        .collect(Collectors.toList()))
                .createdAt(comment.getCreatedAt())
                .updatedAt(comment.getUpdatedAt())
                .build();
    }

    /**
     * Mappa una lista di commenti eseguendo una sola query per gli utenti online.
     */
    public List<CommentResponseDTO> toCommentoResponseDTOList(List<Comment> comments) {
        if (comments == null || comments.isEmpty()) {
            return List.of();
        }
        Set<Long> onlineUserIds = userMapper.getOnlineUserIds();
        return comments.stream()
                .map(c -> toCommentoResponseDTO(c, onlineUserIds))
                .toList();
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