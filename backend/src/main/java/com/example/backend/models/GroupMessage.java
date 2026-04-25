package com.example.backend.models;

import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;

@Entity
@Table(name = "group_messages",
    indexes = {
        @Index(name = "idx_group_messages_group_created", columnList = "group_id, created_at"),
        @Index(name = "idx_group_messages_sender", columnList = "sender_id")
    })
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(exclude = {"group", "sender"})
@EntityListeners(AuditingEntityListener.class)
public class GroupMessage {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "group_id", nullable = false)
    private Group group;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "sender_id", nullable = false)
    private User sender;

    @Column(length = 2000)
    private String content;

    @Column(name = "image_url")
    private String imageUrl;

    @Column(name = "audio_url")
    private String audioUrl;

    @Column(name = "audio_duration")
    private Integer audioDuration; // secondi, max 120

    @Column(name = "is_deleted_by_sender", nullable = false)
    @Builder.Default
    private boolean isDeletedBySender = false;

    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;
}
