package com.example.backend.models;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "push_subscriptions",
    uniqueConstraints = @UniqueConstraint(name = "uq_push_endpoint", columnNames = "endpoint"),
    indexes = @Index(name = "idx_push_user", columnList = "user_id"))
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@EqualsAndHashCode(callSuper = true, exclude = {"user"})
@ToString(exclude = {"user"})
public class PushSubscription extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String endpoint;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String p256dh;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String auth;
}
