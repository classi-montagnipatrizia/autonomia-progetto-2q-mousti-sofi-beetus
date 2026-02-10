package com.example.backend.services;

import com.example.backend.models.AdminAuditLog;
import com.example.backend.models.AzioneAdmin;
import com.example.backend.models.User;
import com.example.backend.repositories.AdminAuditLogRepository;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Service per la gestione dell'audit logging delle azioni admin
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class AdminAuditService {

    private final AdminAuditLogRepository auditLogRepository;

    /**
     * Registra un'azione amministrativa
     */
    @Transactional
    public void logAzioneAdmin(
            User admin,
            AzioneAdmin azione,
            String descrizione,
            String targetType,
            Long targetId,
            User targetUser,
            HttpServletRequest request) {

        String ipAddress = getClientIpAddress(request);

        AdminAuditLog logAdmin = AdminAuditLog.builder()
                .admin(admin)
                .azione(azione)
                .descrizione(descrizione)
                .targetType(targetType)
                .targetId(targetId)
                .targetUser(targetUser)
                .ipAddress(ipAddress)
                .build();

        auditLogRepository.save(logAdmin);

        log.info("Azione admin registrata: {} da {} (ID: {}) - {}",
                azione, admin.getUsername(), admin.getId(), descrizione);
    }

    /**
     * Versione semplificata senza target user
     * Duplica la logica per evitare chiamata interna che bypassa il proxy transactional
     */
    @Transactional
    public void logAzioneAdmin(
            User admin,
            AzioneAdmin azione,
            String descrizione,
            String targetType,
            Long targetId,
            HttpServletRequest request) {

        String ipAddress = getClientIpAddress(request);

        AdminAuditLog logAdmin = AdminAuditLog.builder()
                .admin(admin)
                .azione(azione)
                .descrizione(descrizione)
                .targetType(targetType)
                .targetId(targetId)
                .targetUser(null) // Nessun target user in questa versione
                .ipAddress(ipAddress)
                .build();

        auditLogRepository.save(logAdmin);

        log.info("Azione admin registrata: {} da {} (ID: {}) - {}",
                azione, admin.getUsername(), admin.getId(), descrizione);
    }

    /**
     * Estrae l'indirizzo IP del client dalla richiesta
     */
    private String getClientIpAddress(HttpServletRequest request) {
        String xForwardedFor = request.getHeader("X-Forwarded-For");
        if (xForwardedFor != null && !xForwardedFor.isEmpty()) {
            return xForwardedFor.split(",")[0].trim();
        }

        String xRealIp = request.getHeader("X-Real-IP");
        if (xRealIp != null && !xRealIp.isEmpty()) {
            return xRealIp;
        }

        return request.getRemoteAddr();
    }
}