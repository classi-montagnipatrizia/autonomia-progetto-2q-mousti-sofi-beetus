package com.example.backend.dtos.response;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class GroupSummaryDTO {
    private Long id;
    private String name;
    private String description;
    private String profilePictureUrl;
    private int memberCount;
    private long unreadCount;
    private String lastMessageContent;
    private LocalDateTime lastMessageAt;
    @JsonProperty("isAdmin")
    private boolean isAdmin;
}
