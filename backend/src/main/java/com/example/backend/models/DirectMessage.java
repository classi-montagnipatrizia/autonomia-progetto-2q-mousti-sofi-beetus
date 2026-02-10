package com.example.backend.models;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "direct_messages",
    indexes = {
        @Index(name = "idx_messages_conversation", 
               columnList = "sender_id, receiver_id, is_deleted_permanently, created_at"),
        @Index(name = "idx_messages_reverse", 
               columnList = "receiver_id, sender_id, is_deleted_permanently, created_at"),
        @Index(name = "idx_created_at", columnList = "created_at")
    })
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@EqualsAndHashCode(callSuper = true, exclude = {"sender", "receiver"})
@ToString(exclude = {"sender", "receiver"})
public class DirectMessage extends BaseEntity {
    
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "sender_id", nullable = false)
    private User sender;
    
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "receiver_id", nullable = false)
    private User receiver;
    
    @Column(columnDefinition = "TEXT")
    private String content;

    @Column(name = "image_url")
    private String imageUrl;

    @Column(name = "is_read", nullable = false)
    @Builder.Default
    private boolean isRead = false;
    
    @Column(name = "is_deleted_by_sender", nullable = false)
    @Builder.Default
    private boolean isDeletedBySender = false;
    
    @Column(name = "is_deleted_by_receiver", nullable = false)
    @Builder.Default
    private boolean isDeletedByReceiver = false;
    
    @Column(name = "is_deleted_permanently", nullable = false)
    @Builder.Default
    private boolean isDeletedPermanently = false;
    
    // Helper method per verificare visibilità
    @Transient
    public boolean isVisibleForUser(Long userId) {
        if (isDeletedPermanently) return false;
        
        if (sender.getId().equals(userId)) {
            return !isDeletedBySender;
        } else if (receiver.getId().equals(userId)) {
            return !isDeletedByReceiver;
        }
        return false;
    }
}