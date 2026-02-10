package com.example.backend.controllers;

import com.example.backend.config.CurrentUser;
import com.example.backend.dto.AuditLogDTO;
import com.example.backend.dtos.response.AdminUserListDTO;
import com.example.backend.exception.UnauthorizedException;
import com.example.backend.models.AdminAuditLog;
import com.example.backend.models.AzioneAdmin;
import com.example.backend.models.User;
import com.example.backend.services.AdminService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
@Slf4j
@PreAuthorize("hasRole('ADMIN')")
public class AdminController {

    private final AdminService adminService;
    private static final String MESSAGE_KEY="message";

    /**
     * GET /api/admin/users
     * Ottiene la lista completa degli utenti con paginazione
     * Supporta ricerca opzionale con parametro 'query'
     */
    @GetMapping("/users")
    public ResponseEntity<Page<AdminUserListDTO>> getTuttiUtenti(
            @RequestParam(required = false) String query,
            @PageableDefault(size = 20, sort = "id") Pageable pageable,
            @CurrentUser User admin) {

        log.debug("GET /api/admin/users - Admin: {} - Query: {}", admin.getUsername(), query);

        validateAdminUser(admin);

        Page<AdminUserListDTO> users;
        if (query != null && !query.trim().isEmpty()) {
            users = adminService.cercaUtenti(query.trim(), pageable);
        } else {
            users = adminService.getTuttiUtenti(pageable);
        }

        return ResponseEntity.ok(users);
    }

    /**
     * DELETE /api/admin/users/{userId}
     * Elimina completamente un utente
     */
    @DeleteMapping("/users/{userId}")
    public ResponseEntity<Map<String, String>> eliminaUtente(
            @PathVariable Long userId,
            @CurrentUser User admin,
            HttpServletRequest request) {

        log.debug("DELETE /api/admin/users/{} - Admin: {}", userId, admin.getUsername());

        validateAdminUser(admin);
        adminService.eliminaUtente(admin.getId(), userId, request);

        return ResponseEntity.ok(Map.of(MESSAGE_KEY, "Utente eliminato con successo"));
    }

    /**
     * PUT /api/admin/users/{userId}/disable
     * Disattiva account utente
     */
    @PutMapping("/users/{userId}/disable")
    public ResponseEntity<Map<String, String>> disattivaUtente(
            @PathVariable Long userId,
            @CurrentUser User admin,
            HttpServletRequest request) {

        log.debug("PUT /api/admin/users/{}/disable - Admin: {}", userId, admin.getUsername());

        validateAdminUser(admin);
        adminService.disattivaUtente(admin.getId(), userId, request);

        return ResponseEntity.ok(Map.of(MESSAGE_KEY, "Utente disattivato con successo"));
    }

    /**
     * PUT /api/admin/users/{userId}/enable
     * Riattiva account utente
     */
    @PutMapping("/users/{userId}/enable")
    public ResponseEntity<Map<String, String>> riattivaUtente(
            @PathVariable Long userId,
            @CurrentUser User admin,
            HttpServletRequest request) {

        log.debug("PUT /api/admin/users/{}/enable - Admin: {}", userId, admin.getUsername());

        validateAdminUser(admin);
        adminService.riattivaUtente(admin.getId(), userId, request);

        return ResponseEntity.ok(Map.of(MESSAGE_KEY, "Utente riattivato con successo"));
    }

    /**
     * PUT /api/admin/users/{userId}/promote
     * Promuove utente ad admin
     */
    @PutMapping("/users/{userId}/promote")
    public ResponseEntity<Map<String, String>> promouviAdmin(
            @PathVariable Long userId,
            @CurrentUser User admin,
            HttpServletRequest request) {

        log.debug("PUT /api/admin/users/{}/promote - Admin: {}", userId, admin.getUsername());

        validateAdminUser(admin);
        adminService.promouviAdmin(admin.getId(), userId, request);

        return ResponseEntity.ok(Map.of(MESSAGE_KEY, "Utente promosso ad admin con successo"));
    }

    /**
     * PUT /api/admin/users/{userId}/demote
     * Rimuove privilegi admin
     */
    @PutMapping("/users/{userId}/demote")
    public ResponseEntity<Map<String, String>> rimuoviAdmin(
            @PathVariable Long userId,
            @CurrentUser User admin,
            HttpServletRequest request) {

        log.debug("PUT /api/admin/users/{}/demote - Admin: {}", userId, admin.getUsername());

        validateAdminUser(admin);
        adminService.rimuoviAdmin(admin.getId(), userId, request);

        return ResponseEntity.ok(Map.of(MESSAGE_KEY, "Privilegi admin rimossi con successo"));
    }

    /**
     * DELETE /api/admin/posts/{postId}
     * Elimina un post
     */
    @DeleteMapping("/posts/{postId}")
    public ResponseEntity<Map<String, String>> eliminaPost(
            @PathVariable Long postId,
            @CurrentUser User admin,
            HttpServletRequest request) {

        log.debug("DELETE /api/admin/posts/{} - Admin: {}", postId, admin.getUsername());

        validateAdminUser(admin);
        adminService.eliminaPost(admin.getId(), postId, request);

        return ResponseEntity.ok(Map.of(MESSAGE_KEY, "Post eliminato con successo"));
    }

    /**
     * DELETE /api/admin/comments/{commentId}
     * Elimina un commento
     */
    @DeleteMapping("/comments/{commentId}")
    public ResponseEntity<Map<String, String>> eliminaCommento(
            @PathVariable Long commentId,
            @CurrentUser User admin,
            HttpServletRequest request) {

        log.debug("DELETE /api/admin/comments/{} - Admin: {}", commentId, admin.getUsername());

        validateAdminUser(admin);
        adminService.eliminaCommento(admin.getId(), commentId, request);

        return ResponseEntity.ok(Map.of(MESSAGE_KEY, "Commento eliminato con successo"));
    }

    /**
     * DELETE /api/admin/users/{userId}/posts
     * Elimina tutti i post di un utente
     */
    @DeleteMapping("/users/{userId}/posts")
    public ResponseEntity<Map<String, Object>> eliminaTuttiPostUtente(
            @PathVariable Long userId,
            @CurrentUser User admin,
            HttpServletRequest request) {

        log.debug("DELETE /api/admin/users/{}/posts - Admin: {}", userId, admin.getUsername());

        validateAdminUser(admin);
        int count = adminService.eliminaTuttiPostUtente(admin.getId(), userId, request);

        return ResponseEntity.ok(Map.of(
                MESSAGE_KEY, "Post eliminati con successo",
                "deletedCount", count
        ));
    }

    /**
     * DELETE /api/admin/users/{userId}/comments
     * Elimina tutti i commenti di un utente
     */
    @DeleteMapping("/users/{userId}/comments")
    public ResponseEntity<Map<String, Object>> eliminaTuttiCommentiUtente(
            @PathVariable Long userId,
            @CurrentUser User admin,
            HttpServletRequest request) {

        log.debug("DELETE /api/admin/users/{}/comments - Admin: {}", userId, admin.getUsername());

        validateAdminUser(admin);
        int count = adminService.eliminaTuttiCommentiUtente(admin.getId(), userId, request);

        return ResponseEntity.ok(Map.of(
             MESSAGE_KEY, "Commenti eliminati con successo",
                "deletedCount", count
        ));
    }

    /**
     * GET /api/admin/stats
     * Ottiene statistiche sistema
     */
    @GetMapping("/stats")
    public ResponseEntity<Map<String, Object>> ottieniStatistiche(
            @CurrentUser User admin,
            HttpServletRequest request) {

        log.debug("GET /api/admin/stats - Admin: {}", admin.getUsername());

        validateAdminUser(admin);
        Map<String, Object> stats = adminService.ottieniStatisticheSistema(admin.getId(), request);

        return ResponseEntity.ok(stats);
    }

    /**
     * GET /api/admin/audit-log
     * Ottiene audit log completo
     */
    @GetMapping("/audit-log")
    public ResponseEntity<Page<AuditLogDTO>> ottieniAuditLog(
            @PageableDefault(size = 50, sort = "createdAt", direction = Sort.Direction.DESC)
            Pageable pageable) {

        log.debug("GET /api/admin/audit-log");

        Page<AdminAuditLog> auditLog = adminService.ottieniAuditLog(pageable);
        Page<AuditLogDTO> dtoPage = auditLog.map(this::convertToDTO);

        return ResponseEntity.ok(dtoPage);
    }

    /**
     * GET /api/admin/audit-log/admin/{adminId}
     * Ottiene audit log per admin specifico
     */
    @GetMapping("/audit-log/admin/{adminId}")
    public ResponseEntity<Page<AuditLogDTO>> ottieniAuditLogAdmin(
            @PathVariable Long adminId,
            @PageableDefault(size = 50, sort = "createdAt", direction = Sort.Direction.DESC)
            Pageable pageable) {

        log.debug("GET /api/admin/audit-log/admin/{}", adminId);

        Page<AdminAuditLog> auditLog = adminService.ottieniAuditLogAdmin(adminId, pageable);
        Page<AuditLogDTO> dtoPage = auditLog.map(this::convertToDTO);

        return ResponseEntity.ok(dtoPage);
    }

    /**
     * GET /api/admin/audit-log/action/{action}
     * Ottiene audit log per azione specifica
     */
    @GetMapping("/audit-log/action/{action}")
    public ResponseEntity<Page<AuditLogDTO>> ottieniAuditLogPerAzione(
            @PathVariable AzioneAdmin action,
            @PageableDefault(size = 50, sort = "createdAt", direction = Sort.Direction.DESC)
            Pageable pageable) {

        log.debug("GET /api/admin/audit-log/action/{}", action);

        Page<AdminAuditLog> auditLog = adminService.ottieniAuditLogPerAzione(action, pageable);
        Page<AuditLogDTO> dtoPage = auditLog.map(this::convertToDTO);

        return ResponseEntity.ok(dtoPage);
    }

    /**
     * POST /api/admin/cleanup
     * Pulizia database
     */
    @PostMapping("/cleanup")
    public ResponseEntity<Map<String, Object>> puliziaDatabase(
            @RequestParam(defaultValue = "90") int giorni,
            @CurrentUser User admin,
            HttpServletRequest request) {

        log.debug("POST /api/admin/cleanup?giorni={} - Admin: {}", giorni, admin.getUsername());

        validateAdminUser(admin);
        Map<String, Integer> risultati = adminService.puliziaDatabase(admin.getId(), giorni, request);

        return ResponseEntity.ok(Map.of(
                MESSAGE_KEY, "Pulizia database completata",
                "risultati", risultati
        ));
    }

    /**
     * Helper per verificare permessi admin
     */
    private void validateAdminUser(User user) {
      
        if (! user.getIsAdmin().booleanValue()) {
            throw new UnauthorizedException("Accesso negato: privilegi admin richiesti");
        }
    }

    /**
     * Converte AdminAuditLog in AuditLogDTO
     */
    private AuditLogDTO convertToDTO(AdminAuditLog log) {
        return AuditLogDTO.builder()
                .id(log.getId())
                .adminId(log.getAdmin().getId())
                .adminUsername(log.getAdmin().getUsername())
                .azione(log.getAzione())
                .dettagli(log.getDescrizione())
                .targetType(log.getTargetType())
                .targetId(log.getTargetId())
                .ipAddress(log.getIpAddress())
                .createdAt(log.getCreatedAt())
                .build();
    }
}
