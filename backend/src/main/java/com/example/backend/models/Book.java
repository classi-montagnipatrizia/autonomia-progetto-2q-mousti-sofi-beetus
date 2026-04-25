package com.example.backend.models;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;

@Entity
@Table(name = "books",
    indexes = {
        @Index(name = "idx_book_seller", columnList = "seller_id"),
        @Index(name = "idx_book_status", columnList = "status"),
        @Index(name = "idx_book_created_at", columnList = "created_at"),
        @Index(name = "idx_book_school_year", columnList = "school_year"),
        @Index(name = "idx_book_subject", columnList = "subject"),
        @Index(name = "idx_book_seller_status", columnList = "seller_id, status")
    })
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@EqualsAndHashCode(callSuper = true, exclude = {"seller"})
@ToString(exclude = {"seller"})
public class Book extends BaseEntity {

    @Column(nullable = false, length = 200)
    private String title;

    @Column(nullable = false, length = 200)
    private String author;

    @Column(length = 20)
    private String isbn;

    @Column(length = 500)
    private String description;

    @Column(nullable = false, precision = 8, scale = 2)
    private BigDecimal price;

    @Enumerated(EnumType.STRING)
    @Column(name = "book_condition", nullable = false, length = 20)
    private BookCondition condition;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private BookStatus status = BookStatus.DISPONIBILE;

    @Column(name = "school_year", nullable = false, length = 20)
    private String schoolYear;

    @Column(nullable = false, length = 50)
    private String subject;

    @Column(name = "front_image_url", nullable = false, length = 500)
    private String frontImageUrl;

    @Column(name = "back_image_url", length = 500)
    private String backImageUrl;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "seller_id", nullable = false)
    private User seller;

}
