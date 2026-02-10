package com.example.backend.models;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "notifications",
    indexes = {
        @Index(name = "idx_notifications_unread", columnList = "user_id, is_read, created_at DESC"),
        @Index(name = "idx_created_at", columnList = "created_at")
    })
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@EqualsAndHashCode(callSuper = true, exclude = {"user", "triggeredByUser", "relatedPost", "relatedComment", "relatedMessage"})
@ToString(exclude = {"user", "triggeredByUser", "relatedPost", "relatedComment", "relatedMessage"})
public class Notification extends BaseEntity {
    
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;
    
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private NotificationType type;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "related_post_id")
    private Post relatedPost;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "related_comment_id")
    private Comment relatedComment;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "related_message_id")
    private DirectMessage relatedMessage;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "triggered_by_user_id")
    private User triggeredByUser;
    
    @Column(length = 255)
    private String content;
    
    @Column(name = "action_url", length = 255)
    private String actionUrl;
    
    @Column(name = "is_read", nullable = false)
    @Builder.Default
    private Boolean isRead = false;
}
