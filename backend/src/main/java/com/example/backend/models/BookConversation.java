package com.example.backend.models;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "book_conversations",
    indexes = {
        @Index(name = "idx_book_conv_seller", columnList = "seller_id"),
        @Index(name = "idx_book_conv_buyer", columnList = "buyer_id"),
        @Index(name = "idx_book_conv_book", columnList = "book_id"),
        @Index(name = "idx_book_conv_last_msg", columnList = "last_message_at DESC")
    },
    uniqueConstraints = {
        @UniqueConstraint(name = "uk_book_buyer", columnNames = {"book_id", "buyer_id"})
    })
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@EqualsAndHashCode(callSuper = true, exclude = {"book", "seller", "buyer"})
@ToString(exclude = {"book", "seller", "buyer"})
public class BookConversation extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "book_id", nullable = false)
    private Book book;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "seller_id", nullable = false)
    private User seller;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "buyer_id", nullable = false)
    private User buyer;

    @Column(name = "last_message_at")
    private LocalDateTime lastMessageAt;

    @Column(name = "hidden_by_seller", nullable = false)
    @Builder.Default
    private boolean hiddenBySeller = false;

    @Column(name = "hidden_by_buyer", nullable = false)
    @Builder.Default
    private boolean hiddenByBuyer = false;
}
