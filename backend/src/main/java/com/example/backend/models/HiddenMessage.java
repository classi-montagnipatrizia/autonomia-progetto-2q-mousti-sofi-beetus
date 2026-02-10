package com.example.backend.models;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "hidden_messages",
       uniqueConstraints = @UniqueConstraint(columnNames = {"message_id", "user_id"}),
    indexes = {
        @Index(name = "idx_message_id", columnList = "message_id"),
        @Index(name = "idx_user_id", columnList = "user_id")
    })
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@EqualsAndHashCode(callSuper = false)
@ToString(exclude = {"message", "user"})
public class HiddenMessage {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "message_id", nullable = false)
    private DirectMessage message;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "hidden_at", nullable = false)
    @Builder.Default
    private LocalDateTime hiddenAt = LocalDateTime.now();
}
