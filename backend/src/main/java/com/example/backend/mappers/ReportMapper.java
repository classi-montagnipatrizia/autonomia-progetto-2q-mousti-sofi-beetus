package com.example.backend.mappers;

import com.example.backend.dtos.response.SegnazioneResponseDTO;
import com.example.backend.models.Report;
import com.example.backend.repositories.CommentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class ReportMapper {

    private final UserMapper userMapper;
    private final CommentRepository commentRepository;

    public SegnazioneResponseDTO toDTO(Report report) {
        if (report == null) return null;

        Long postId = null;
        if ("COMMENT".equals(report.getTargetType())) {
            postId = commentRepository.findPostIdByCommentId(report.getTargetId()).orElse(null);
        }

        return SegnazioneResponseDTO.builder()
                .id(report.getId())
                .reporter(userMapper.toUtenteSummaryDTO(report.getReporter()))
                .targetType(report.getTargetType())
                .targetId(report.getTargetId())
                .postId(postId)
                .reason(report.getReason())
                .customReason(report.getCustomReason())
                .status(report.getStatus())
                .resolvedBy(userMapper.toUtenteSummaryDTO(report.getResolvedBy()))
                .resolvedAt(report.getResolvedAt())
                .createdAt(report.getCreatedAt())
                .build();
    }
}
