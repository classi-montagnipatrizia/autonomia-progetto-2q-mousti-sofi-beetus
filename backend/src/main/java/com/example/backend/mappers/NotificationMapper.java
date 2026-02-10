package com.example.backend.mappers;

import com.example.backend.dtos.response.NotificationResponseDTO;
import com.example.backend.models.Notification;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class NotificationMapper {

    private final UserMapper userMapper;

    public NotificationResponseDTO toNotificaResponseDTO(Notification notification) {
        if (notification == null) return null;

        return NotificationResponseDTO.builder()
                .id(notification.getId())
                .tipo(notification.getType())
                .utenteCheLHaGenerata(userMapper.toUtenteSummaryDTO(notification.getTriggeredByUser()))
                .contenuto(notification.getContent())
                .actionUrl(notification.getActionUrl())
                .isRead(notification.getIsRead())
                .createdAt(notification.getCreatedAt())
                .build();
    }
}
