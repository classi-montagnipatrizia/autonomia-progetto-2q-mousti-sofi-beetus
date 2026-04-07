package com.example.backend.models;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "book_requests",
    indexes = {
        @Index(name = "idx_book_request_book", columnList = "book_id"),
        @Index(name = "idx_book_request_buyer", columnList = "buyer_id"),
        @Index(name = "idx_book_request_status", columnList = "status")
    },
    uniqueConstraints = {
        @UniqueConstraint(name = "uk_book_request_book_buyer", columnNames = {"book_id", "buyer_id"})
    })
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@EqualsAndHashCode(callSuper = true, exclude = {"book", "buyer"})
@ToString(exclude = {"book", "buyer"})
public class BookRequest extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "book_id", nullable = false)
    private Book book;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "buyer_id", nullable = false)
    private User buyer;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private BookRequestStatus status = BookRequestStatus.PENDING;
}
