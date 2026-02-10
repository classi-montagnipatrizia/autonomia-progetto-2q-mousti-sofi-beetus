package com.example.backend.mappers;

import com.example.backend.dtos.response.MentionResponseDTO;
import com.example.backend.models.*;
import com.example.backend.repositories.CommentRepository;
import com.example.backend.repositories.PostRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

/**
 * Mapper per convertire l'entità Mention in MentionResponseDTO.
 * <p>
 * Gestisce la logica di recupero del contenuto e costruzione dell'URL
 * in base al tipo di menzione (POST, COMMENT).
 */
@Component
@RequiredArgsConstructor
public class MentionMapper {

    private final UserMapper userMapper;
    private final PostRepository postRepository;
    private final CommentRepository commentRepository;
  

    private static final int PREVIEW_LENGTH = 100;

    /**
     * Converte un'entità Mention in MentionResponseDTO.
     * <p>
     * Recupera il contenuto effettivo (post e commento)
     * per creare un'anteprima e l'URL di navigazione.
     *
     * @param mention L'entità Mention da convertire
     * @return MentionResponseDTO con tutti i dettagli
     */
    public MentionResponseDTO toMentionResponseDTO(Mention mention) {
        if (mention == null) {
            return null;
        }

        String actionUrl = "";
        String preview = "";

        // Recupera contenuto e costruisci URL in base al tipo
        try {
            switch (mention.getMentionableType()) {
                case POST -> {
                    Post post = postRepository.findById(mention.getMentionableId()).orElse(null);
                    if (post != null) {
                        actionUrl = "/post/" + post.getId();
                        preview = truncate(post.getContent());
                    }
                }
                case COMMENT -> {
                    Comment comment = commentRepository.findById(mention.getMentionableId()).orElse(null);
                    if (comment != null) {
                        actionUrl = "/post/" + comment.getPost().getId();
                        preview = truncate(comment.getContent());
                    }
                }
                
            }
        } catch (Exception e) {
            // Se il contenuto è stato eliminato, usa valori di default
            actionUrl = "";
            preview = "[Contenuto non disponibile]";
        }

        return MentionResponseDTO.builder()
                .id(mention.getId())
                .utenteMenzionante(userMapper.toUtenteSummaryDTO(mention.getMentioningUser()))
                .tipo(mention.getMentionableType())
                .contenutoId(mention.getMentionableId())
                .actionUrl(actionUrl)
                .anteprimaContenuto(preview)
                .createdAt(mention.getCreatedAt())
                .build();
    }

    /**
     * Tronca il testo alla lunghezza massima specificata.
     * Aggiunge "..." se il testo è più lungo.
     *
     * @param text Il testo da troncare
     * @return Il testo troncato con "..." se necessario
     */
    private String truncate(String text) {
        if (text == null || text.isBlank()) {
            return "";
        }

        if (text.length() <= PREVIEW_LENGTH) {
            return text;
        }

        return text.substring(0, PREVIEW_LENGTH) + "...";
    }
}
