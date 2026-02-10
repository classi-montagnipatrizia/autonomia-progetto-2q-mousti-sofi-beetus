package com.example.backend.dtos.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserResponseDTO {
    private Long id;
    private String username;
    private String email;
    private String nomeCompleto;
    private String bio;
    private String profilePictureUrl;
    private Boolean isAdmin;
    private Boolean isActive;
    private LocalDateTime lastSeen;
    private Boolean isOnline;
    private String classroom;
}
