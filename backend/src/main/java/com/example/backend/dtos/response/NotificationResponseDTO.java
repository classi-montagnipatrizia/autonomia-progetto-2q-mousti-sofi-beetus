package com.example.backend.dtos.response;
import com.example.backend.models.NotificationType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class NotificationResponseDTO {
    private Long id;
    private NotificationType tipo;
    private UserSummaryDTO utenteCheLHaGenerata;
    private String contenuto;
    private String actionUrl;
    private Boolean isRead;
    private LocalDateTime createdAt;
}
