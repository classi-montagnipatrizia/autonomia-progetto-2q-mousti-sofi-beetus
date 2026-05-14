package com.example.backend.services;

import com.example.backend.dtos.request.CreaSegnazioneRequestDTO;
import com.example.backend.dtos.response.SegnazioneResponseDTO;
import com.example.backend.exception.InvalidInputException;
import com.example.backend.exception.ResourceAlreadyExistsException;
import com.example.backend.exception.ResourceNotFoundException;
import com.example.backend.mappers.ReportMapper;
import com.example.backend.models.AzioneAdmin;
import com.example.backend.models.Report;
import com.example.backend.models.ReportReason;
import com.example.backend.models.User;
import com.example.backend.repositories.CommentRepository;
import com.example.backend.repositories.PostRepository;
import com.example.backend.repositories.ReportRepository;
import com.example.backend.repositories.UserRepository;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
@Slf4j
public class ReportService {

    private final ReportRepository reportRepository;
    private final UserRepository userRepository;
    private final PostRepository postRepository;
    private final CommentRepository commentRepository;
    private final ReportMapper reportMapper;
    private final NotificationService notificationService;
    private final AdminAuditService adminAuditService;

    @Transactional
    public SegnazioneResponseDTO segnala(User reporter, CreaSegnazioneRequestDTO dto) {
        if (reporter == null) return null;

        // Verifica doppia segnalazione
        if (reportRepository.existsByReporterIdAndTargetTypeAndTargetId(
                reporter.getId(), dto.getTargetType(), dto.getTargetId())) {
            throw new ResourceAlreadyExistsException("Hai già segnalato questo contenuto");
        }

        // Verifica che il target esista e che il reporter non ne sia l'autore
        validateTarget(reporter.getId(), dto.getTargetType(), dto.getTargetId());

        // customReason obbligatorio se reason = ALTRO
        if (ReportReason.ALTRO.equals(dto.getReason())
                && (dto.getCustomReason() == null || dto.getCustomReason().isBlank())) {
            throw new InvalidInputException("Specifica il motivo della segnalazione");
        }

        Report report = Report.builder()
                .reporter(reporter)
                .targetType(dto.getTargetType())
                .targetId(dto.getTargetId())
                .reason(dto.getReason())
                .customReason(dto.getCustomReason())
                .status("PENDING")
                .build();

        reportRepository.save(report);
        log.info("Segnalazione creata - reporter: {}, target: {}/{}", reporter.getId(), dto.getTargetType(), dto.getTargetId());

        // Notifica admin (async, best-effort)
        notificationService.notificaAdminNuovaSegnalazione(reporter, dto.getTargetType(), dto.getTargetId(), report.getId());

        return reportMapper.toDTO(report);
    }

    @Transactional
    public SegnazioneResponseDTO risolvi(Long reportId, User admin, HttpServletRequest request) {
        Report report = reportRepository.findById(reportId)
                .orElseThrow(() -> new ResourceNotFoundException("Segnalazione", "id", reportId));

        if ("RESOLVED".equals(report.getStatus())) {
            throw new InvalidInputException("La segnalazione è già stata risolta");
        }

        report.setStatus("RESOLVED");
        report.setResolvedBy(admin);
        report.setResolvedAt(LocalDateTime.now());
        reportRepository.save(report);

        adminAuditService.logAzioneAdmin(admin, AzioneAdmin.RISOLVI_SEGNALAZIONE,
                "Segnalazione #" + reportId + " risolta", "REPORT", reportId, request);

        log.info("Segnalazione {} risolta da admin {}", reportId, admin.getId());
        return reportMapper.toDTO(report);
    }

    @Transactional(readOnly = true)
    public Page<SegnazioneResponseDTO> lista(String status, Pageable pageable) {
        Page<Report> page = (status != null && !status.isBlank())
                ? reportRepository.findByStatusWithDetails(status, pageable)
                : reportRepository.findAllWithDetails(pageable);

        return page.map(reportMapper::toDTO);
    }

    private void validateTarget(Long reporterId, String targetType, Long targetId) {
        switch (targetType) {
            case "POST" -> {
                var post = postRepository.findById(targetId)
                        .orElseThrow(() -> new ResourceNotFoundException("Post", "id", targetId));
                if (post.getUser().getId().equals(reporterId)) {
                    throw new InvalidInputException("Non puoi segnalare un tuo contenuto");
                }
            }
            case "COMMENT" -> {
                var comment = commentRepository.findById(targetId)
                        .orElseThrow(() -> new ResourceNotFoundException("Commento", "id", targetId));
                if (comment.getUser().getId().equals(reporterId)) {
                    throw new InvalidInputException("Non puoi segnalare un tuo contenuto");
                }
            }
            default -> throw new InvalidInputException("Tipo target non valido: " + targetType);
        }
    }
}
