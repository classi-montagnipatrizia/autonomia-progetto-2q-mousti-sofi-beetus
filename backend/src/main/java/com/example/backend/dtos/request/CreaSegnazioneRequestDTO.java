package com.example.backend.dtos.request;

import com.example.backend.models.ReportReason;
import jakarta.validation.constraints.*;
import lombok.Data;

@Data
public class CreaSegnazioneRequestDTO {

    @NotBlank(message = "Il tipo di target è obbligatorio")
    @Pattern(regexp = "^(POST|COMMENT)$", message = "Il tipo deve essere POST o COMMENT")
    private String targetType;

    @NotNull(message = "L'ID del contenuto è obbligatorio")
    private Long targetId;

    @NotNull(message = "Il motivo è obbligatorio")
    private ReportReason reason;

    @Size(max = 500, message = "La motivazione non può superare 500 caratteri")
    private String customReason;
}
