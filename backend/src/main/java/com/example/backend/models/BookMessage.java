package com.example.backend.models;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "book_messages",
    indexes = {
        @Index(name = "idx_book_msg_conversation", columnList = "conversation_id, created_at"),
        @Index(name = "idx_book_msg_sender", columnList = "sender_id")
    })
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@EqualsAndHashCode(callSuper = true, exclude = {"conversation", "sender"})
@ToString(exclude = {"conversation", "sender"})
public class BookMessage extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "conversation_id", nullable = false)
    private BookConversation conversation;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "sender_id", nullable = false)
    private User sender;

    @Column(nullable = false, length = 1000)
    private String content;

    @Column(name = "is_read", nullable = false)
    @Builder.Default
    private boolean isRead = false;

    @Column(name = "is_deleted_by_sender", nullable = false)
    @Builder.Default
    private boolean isDeletedBySender = false;
}
