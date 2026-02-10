package com.example.backend.dto;

import com.example.backend.models.AzioneAdmin;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * DTO per rappresentare un log di audit in modo ottimizzato per il frontend
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AuditLogDTO {
    private Long id;
    private Long adminId;
    private String adminUsername;
    private AzioneAdmin azione;
    private String dettagli;
    private String targetType;
    private Long targetId;
    private String ipAddress;
    private LocalDateTime createdAt;
}
