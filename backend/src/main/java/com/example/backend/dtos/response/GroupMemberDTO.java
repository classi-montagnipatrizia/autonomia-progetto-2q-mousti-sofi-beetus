package com.example.backend.dtos.response;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class GroupMemberDTO {
    private Long id;
    private String username;
    private String fullName;
    private String profilePictureUrl;
    private boolean isAdmin;
    private LocalDateTime joinedAt;
}
