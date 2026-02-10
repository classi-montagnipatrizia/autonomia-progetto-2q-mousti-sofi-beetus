package com.example.backend.mappers;

import com.example.backend.dtos.response.PostResponseDTO;
import com.example.backend.dtos.response.PostDettaglioResponseDTO;
import com.example.backend.models.Post;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.Set;


@Component
@RequiredArgsConstructor
public class PostMapper {

    private final UserMapper userMapper;
    private final CommentMapper commentMapper;

    public PostResponseDTO toPostResponseDTO(Post post, Long currentUserId) {
        if (post == null) return null;

        return PostResponseDTO.builder()
                .id(post.getId())
                .autore(userMapper.toUtenteSummaryDTO(post.getUser()))
                .contenuto(post.getContent())
                .imageUrl(post.getImageUrl())
                .likesCount(post.getLikesCount())
                .commentsCount(post.getCommentsCount())
                .hasLiked(post.isLikedByUser(currentUserId))
                .createdAt(post.getCreatedAt())
                .updatedAt(post.getUpdatedAt())
                .build();
    }

    /**
     * Converte un post in DTO usando un set precaricato di utenti online.
     * Ottimizzazione per evitare N+1 queries.
     */
    public PostResponseDTO toPostResponseDTO(Post post, Long currentUserId, Set<Long> onlineUserIds) {
        if (post == null) return null;

        return PostResponseDTO.builder()
                .id(post.getId())
                .autore(userMapper.toUtenteSummaryDTO(post.getUser(), onlineUserIds))
                .contenuto(post.getContent())
                .imageUrl(post.getImageUrl())
                .likesCount(post.getLikesCount())
                .commentsCount(post.getCommentsCount())
                .hasLiked(post.isLikedByUser(currentUserId))
                .createdAt(post.getCreatedAt())
                .updatedAt(post.getUpdatedAt())
                .build();
    }

    public PostDettaglioResponseDTO toPostDettaglioResponseDTO(Post post, Long currentUserId) {
        if (post == null) return null;

        return PostDettaglioResponseDTO.builder()
                .id(post.getId())
                .autore(userMapper.toUtenteSummaryDTO(post.getUser()))
                .contenuto(post.getContent())
                .imageUrl(post.getImageUrl())
                .likesCount(post.getLikesCount())
                .commentsCount(post.getCommentsCount())
                .hasLiked(post.isLikedByUser(currentUserId))
                .commenti(post.getComments().stream()
                        .filter(c -> !c.getIsDeletedByAuthor() 
                                && !c.isHiddenForUser(currentUserId)
                                && c.getParentComment() == null) // Solo commenti principali
                        .map(commentMapper::toCommentoResponseDTO)
                        .toList())
                .createdAt(post.getCreatedAt())
                .updatedAt(post.getUpdatedAt())
                .build();
    }

    /**
     * Ottiene il set di tutti gli ID utenti online.
     * Delegato al UserMapper.
     */
    public Set<Long> getOnlineUserIds() {
        return userMapper.getOnlineUserIds();
    }
}