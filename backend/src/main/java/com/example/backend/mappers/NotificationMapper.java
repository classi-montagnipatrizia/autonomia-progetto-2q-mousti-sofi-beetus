package com.example.backend.mappers;

import com.example.backend.dtos.response.NotificationResponseDTO;
import com.example.backend.models.Notification;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Set;

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

    /**
     * Overload batch-friendly: usa onlineUserIds precaricato per evitare una query per notifica
     * a {@code findByUserIdAndIsOnlineTrue}. Da preferire per liste/pagine.
     */
    public NotificationResponseDTO toNotificaResponseDTO(Notification notification, Set<Long> onlineUserIds) {
        if (notification == null) return null;

        return NotificationResponseDTO.builder()
                .id(notification.getId())
                .tipo(notification.getType())
                .utenteCheLHaGenerata(userMapper.toUtenteSummaryDTO(notification.getTriggeredByUser(), onlineUserIds))
                .contenuto(notification.getContent())
                .actionUrl(notification.getActionUrl())
                .isRead(notification.getIsRead())
                .createdAt(notification.getCreatedAt())
                .build();
    }

    /**
     * Mappa una lista di notifiche eseguendo una sola query per gli utenti online.
     */
    public List<NotificationResponseDTO> toNotificaResponseDTOList(List<Notification> notifications) {
        if (notifications == null || notifications.isEmpty()) {
            return List.of();
        }
        Set<Long> onlineUserIds = userMapper.getOnlineUserIds();
        return notifications.stream()
                .map(n -> toNotificaResponseDTO(n, onlineUserIds))
                .toList();
    }
}
