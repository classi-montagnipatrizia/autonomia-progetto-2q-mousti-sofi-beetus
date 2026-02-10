package com.example.backend.dtos.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DTO per la lista utenti nella pagina admin
 * Include informazioni admin-specific: email, isAdmin, isActive
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AdminUserListDTO {
    private Long id;
    private String username;
    private String nomeCompleto;
    private String profilePictureUrl;
    private String email;
    private Boolean isAdmin;
    private Boolean isActive;
}
