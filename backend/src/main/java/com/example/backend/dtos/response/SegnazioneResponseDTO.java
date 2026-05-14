package com.example.backend.dtos.response;

import com.example.backend.models.ReportReason;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SegnazioneResponseDTO {
    private Long id;
    private UserSummaryDTO reporter;
    private String targetType;
    private Long targetId;
    private Long postId; // solo per targetType=COMMENT, null per POST
    private ReportReason reason;
    private String customReason;
    private String status;
    private UserSummaryDTO resolvedBy;
    private LocalDateTime resolvedAt;
    private LocalDateTime createdAt;
}
