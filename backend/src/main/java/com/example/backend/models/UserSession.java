package com.example.backend.models;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "user_sessions",
    indexes = {
        @Index(name = "idx_user_id", columnList = "user_id"),
        @Index(name = "idx_session_id", columnList = "session_id")
    })
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@EqualsAndHashCode(callSuper = false)
@ToString(exclude = {"user"})
public class UserSession {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;
    
    @Column(name = "session_id", length = 255, unique = true, nullable = false)
    private String sessionId;
    
    @Column(name = "is_online", nullable = false)
    @Builder.Default
    private Boolean isOnline = true;
    
    @Column(name = "last_activity", nullable = false)
    @Builder.Default
    private LocalDateTime lastActivity = LocalDateTime.now();
    
    @Column(name = "created_at", nullable = false)
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();
    
    @Transient
    public boolean isActive() {
        // Considera attivo se ultima attività negli ultimi 5 minuti
        return isOnline && lastActivity.isAfter(LocalDateTime.now().minusMinutes(5));
    }
}

