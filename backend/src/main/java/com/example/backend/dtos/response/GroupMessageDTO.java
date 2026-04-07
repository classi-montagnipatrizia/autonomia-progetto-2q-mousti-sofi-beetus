package com.example.backend.dtos.response;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class GroupMessageDTO {
    private Long id;
    private Long groupId;
    private Long senderId;
    private String senderUsername;
    private String senderFullName;
    private String senderProfilePictureUrl;
    private String content;
    private String imageUrl;
    private String audioUrl;
    private Integer audioDuration;
    private Boolean isDeletedBySender;
    private LocalDateTime createdAt;
}
