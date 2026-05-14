package com.example.backend.controllers;

import com.example.backend.config.CurrentUser;
import com.example.backend.dtos.request.CreaSegnazioneRequestDTO;
import com.example.backend.dtos.response.SegnazioneResponseDTO;
import com.example.backend.models.User;
import com.example.backend.services.ReportService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/reports")
@RequiredArgsConstructor
@Slf4j
public class ReportController {

    private final ReportService reportService;

    /**
     * Crea una nuova segnalazione.
     * Qualsiasi utente autenticato può segnalare contenuti altrui.
     */
    @PostMapping
    public ResponseEntity<SegnazioneResponseDTO> segnala(
            @CurrentUser User user,
            @Valid @RequestBody CreaSegnazioneRequestDTO dto) {
        log.debug("POST /api/reports - user: {}, target: {}/{}", user.getId(), dto.getTargetType(), dto.getTargetId());
        return ResponseEntity.status(HttpStatus.CREATED).body(reportService.segnala(user, dto));
    }

    /**
     * Lista segnalazioni — solo admin.
     * Query param: status=PENDING|RESOLVED (opzionale)
     */
    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Page<SegnazioneResponseDTO>> lista(
            @RequestParam(required = false) String status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        var pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());
        return ResponseEntity.ok(reportService.lista(status, pageable));
    }

    /**
     * Segna una segnalazione come risolta — solo admin.
     */
    @PatchMapping("/{id}/risolvi")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<SegnazioneResponseDTO> risolvi(
            @PathVariable Long id,
            @CurrentUser User admin,
            HttpServletRequest request) {
        log.debug("PATCH /api/reports/{}/risolvi - admin: {}", id, admin.getId());
        return ResponseEntity.ok(reportService.risolvi(id, admin, request));
    }
}
