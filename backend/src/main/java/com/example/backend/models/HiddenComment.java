package com.example.backend.models;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "hidden_comments",
       uniqueConstraints = @UniqueConstraint(columnNames = {"comment_id", "user_id"}),
       
    indexes = {
        @Index(name = "idx_comment_id", columnList = "comment_id"),
        @Index(name = "idx_user_id", columnList = "user_id")
    })
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@EqualsAndHashCode(callSuper = false)
@ToString(exclude = {"comment", "user"})
public class HiddenComment {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "comment_id", nullable = false)
    private Comment comment;
    
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;
    
    @Column(name = "hidden_at", nullable = false)
    @Builder.Default
    private LocalDateTime hiddenAt = LocalDateTime.now();
}
