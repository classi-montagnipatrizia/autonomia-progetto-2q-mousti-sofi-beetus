package com.example.backend.dtos.response;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
public class GroupResponseDTO {
    private Long id;
    private String name;
    private String description;
    private String profilePictureUrl;
    private Long adminId;
    private String adminUsername;
    private int memberCount;
    private List<GroupMemberDTO> members;
    private LocalDateTime createdAt;
    @JsonProperty("isAdmin")
    private boolean isAdmin;
}
