package com.example.backend.dtos.response;

import com.example.backend.models.MentionableType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * DTO per la risposta di una menzione.
 * <p>
 * Contiene le informazioni su quando e dove un utente è stato menzionato:
 * - Chi ha fatto la menzione
 * - Dove è stata fatta (POST, COMMENT)
 * - Quando è stata creata
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MentionResponseDTO {

    /**
     * ID della menzione
     */
    private Long id;

    /**
     * L'utente che ha fatto la menzione (@username)
     */
    private UserSummaryDTO utenteMenzionante;

    /**
     * Tipo di contenuto dove è avvenuta la menzione
     * (POST, COMMENT)
     */
    private MentionableType tipo;

    /**
     * ID del contenuto dove è avvenuta la menzione
     * (es: postId, commentId)
     */
    private Long contenutoId;

    /**
     * URL per navigare al contenuto della menzione
     */
    private String actionUrl;

    /**
     * Anteprima del contenuto (primi 100 caratteri)
     */
    private String anteprimaContenuto;

    /**
     * Data e ora della menzione
     */
    private LocalDateTime createdAt;
}
