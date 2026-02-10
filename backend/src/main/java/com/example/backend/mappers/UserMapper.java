package com.example.backend.mappers;

import com.example.backend.dtos.response.UserSummaryDTO;
import com.example.backend.dtos.response.UserResponseDTO;
import com.example.backend.models.User;
import com.example.backend.repositories.UserSessionRepository;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Component
public class UserMapper {

    private final UserSessionRepository userSessionRepository;

    public UserMapper(UserSessionRepository userSessionRepository) {
        this.userSessionRepository = userSessionRepository;
    }

    public UserResponseDTO toUtenteResponseDTO(User user) {
        if (user == null) return null;

        return UserResponseDTO.builder()
                .id(user.getId())
                .username(user.getUsername())
                .email(user.getEmail())
                .nomeCompleto(user.getFullName())
                .bio(user.getBio())
                .profilePictureUrl(user.getProfilePictureUrl())
                .isAdmin(user.getIsAdmin())
                .isActive(user.getIsActive())
                .lastSeen(user.getLastSeen())
                .isOnline(isUserOnline(user))
                .classroom(user.getClassroom())
                .build();
    }

    /**
     * Converte un utente in UserResponseDTO usando un set precaricato di utenti online.
     * Ottimizzazione per evitare N+1 queries.
     */
    public UserResponseDTO toUtenteResponseDTO(User user, Set<Long> onlineUserIds) {
        if (user == null) return null;

        return UserResponseDTO.builder()
                .id(user.getId())
                .username(user.getUsername())
                .email(user.getEmail())
                .nomeCompleto(user.getFullName())
                .bio(user.getBio())
                .profilePictureUrl(user.getProfilePictureUrl())
                .isAdmin(user.getIsAdmin())
                .isActive(user.getIsActive())
                .lastSeen(user.getLastSeen())
                .isOnline(onlineUserIds.contains(user.getId()))
                .classroom(user.getClassroom())
                .build();
    }

    public UserSummaryDTO toUtenteSummaryDTO(User user) {
        if (user == null) return null;

        return UserSummaryDTO.builder()
                .id(user.getId())
                .username(user.getUsername())
                .nomeCompleto(user.getFullName())
                .profilePictureUrl(user.getProfilePictureUrl())
                .isOnline(isUserOnline(user))
                .classroom(user.getClassroom())
                .build();
    }

    /**
     * Converte un utente in UserSummaryDTO usando un set precaricato di utenti online.
     * Ottimizzazione per evitare N+1 queries.
     */
    public UserSummaryDTO toUtenteSummaryDTO(User user, Set<Long> onlineUserIds) {
        if (user == null) return null;

        return UserSummaryDTO.builder()
                .id(user.getId())
                .username(user.getUsername())
                .nomeCompleto(user.getFullName())
                .profilePictureUrl(user.getProfilePictureUrl())
                .isOnline(onlineUserIds.contains(user.getId()))
                .classroom(user.getClassroom())
                .build();
    }

    /**
     * Converte una lista di utenti in UserSummaryDTO con una singola query per lo stato online.
     * Ottimizzazione batch per evitare N+1 queries.
     */
    public List<UserSummaryDTO> toUtenteSummaryDTOList(List<User> users) {
        if (users == null || users.isEmpty()) {
            return List.of();
        }
        
        // Una singola query per ottenere tutti gli utenti online
        Set<Long> onlineUserIds = userSessionRepository.findAllOnlineUserIds();
        
        return users.stream()
                .map(user -> toUtenteSummaryDTO(user, onlineUserIds))
                .collect(Collectors.toList());
    }

    /**
     * Converte una lista di utenti in UserResponseDTO con una singola query per lo stato online.
     * Ottimizzazione batch per evitare N+1 queries.
     */
    public List<UserResponseDTO> toUtenteResponseDTOList(List<User> users) {
        if (users == null || users.isEmpty()) {
            return List.of();
        }
        
        // Una singola query per ottenere tutti gli utenti online
        Set<Long> onlineUserIds = userSessionRepository.findAllOnlineUserIds();
        
        return users.stream()
                .map(user -> toUtenteResponseDTO(user, onlineUserIds))
                .collect(Collectors.toList());
    }

    /**
     * Ottiene il set di tutti gli ID utenti online.
     * Utile per componenti che devono fare il mapping manualmente.
     */
    public Set<Long> getOnlineUserIds() {
        return userSessionRepository.findAllOnlineUserIds();
    }

    /**
     * Determina se un utente è online verificando le sessioni WebSocket attive.
     * <p>
     * Un utente è considerato online se ha almeno una sessione WebSocket attiva
     * (isOnline = true). Questo è più accurato rispetto a usare lastSeen perché
     * riflette lo stato reale della connessione WebSocket.
     *
     * @param user L'utente da verificare
     * @return true se online, false altrimenti
     */
    private Boolean isUserOnline(User user) {
        if (user == null || user.getId() == null) {
            return false;
        }
        
        // Verifica se l'utente ha almeno una sessione WebSocket attiva
        return !userSessionRepository.findByUserIdAndIsOnlineTrue(user.getId()).isEmpty();
    }
}
