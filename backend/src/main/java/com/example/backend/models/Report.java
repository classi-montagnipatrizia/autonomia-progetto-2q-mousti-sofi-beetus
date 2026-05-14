package com.example.backend.models;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(
    name = "reports",
    indexes = {
        @Index(name = "idx_reports_status_created", columnList = "status, created_at"),
        @Index(name = "idx_reports_reporter", columnList = "reporter_id")
    },
    uniqueConstraints = {
        @UniqueConstraint(name = "uq_report_reporter_target",
            columnNames = {"reporter_id", "target_type", "target_id"})
    }
)
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@EqualsAndHashCode(callSuper = true, exclude = {"reporter", "resolvedBy"})
@ToString(exclude = {"reporter", "resolvedBy"})
public class Report extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "reporter_id", nullable = false)
    private User reporter;

    @Column(name = "target_type", nullable = false, length = 10)
    private String targetType; // "POST" | "COMMENT"

    @Column(name = "target_id", nullable = false)
    private Long targetId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ReportReason reason;

    @Column(name = "custom_reason", length = 500)
    private String customReason;

    @Column(nullable = false, length = 10)
    @Builder.Default
    private String status = "PENDING"; // "PENDING" | "RESOLVED"

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "resolved_by_id")
    private User resolvedBy;

    @Column(name = "resolved_at")
    private LocalDateTime resolvedAt;
}
