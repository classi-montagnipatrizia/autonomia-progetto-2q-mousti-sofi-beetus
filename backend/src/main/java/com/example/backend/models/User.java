package com.example.backend.models;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.Set;


@Entity
@Table(name = "users",indexes = {
        @Index(name = "idx_username", columnList = "username"),
        @Index(name = "idx_email", columnList = "email"),
        @Index(name = "idx_classroom", columnList = "classroom")
    })
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@EqualsAndHashCode(callSuper = true, exclude = {"posts", "comments", "likes", "sentMessages", "receivedMessages", "notifications"})
@ToString(exclude = {"posts", "comments", "likes", "sentMessages", "receivedMessages", "notifications"})

public class User extends BaseEntity {
@Column(length = 50, unique = true, nullable = false)
    private String username;
    
    @Column(length = 100, unique = true, nullable = false)
    private String email;
    
    @Column(name = "password_hash", nullable = false)
    private String passwordHash;
    
    @Column(name = "full_name", length = 100, nullable = false)
    private String fullName;
    @Column(name = "user_bio", length = 100, nullable = true)
    private String bio;
    
    @Column(name = "profile_picture_url", length = 2048)
    private String profilePictureUrl;


    @Column(name = "is_admin", nullable = false)
    @Builder.Default
    private Boolean isAdmin = false;
    
    @Column(name = "is_active", nullable = false)
    @Builder.Default
    private Boolean isActive = true;
    
    @Column(name = "last_seen")
    private LocalDateTime lastSeen;

    @Column(name = "classroom", length = 10)
    private String classroom;

    // Relazioni
    @OneToMany(mappedBy = "user", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    @Builder.Default
    private Set<Post> posts = new HashSet<>();
    
    @OneToMany(mappedBy = "user", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    @Builder.Default
    private Set<Comment> comments = new HashSet<>();
    
    @OneToMany(mappedBy = "user", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    @Builder.Default
    private Set<Like> likes = new HashSet<>();
    
    @OneToMany(mappedBy = "sender", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    @Builder.Default
    private Set<DirectMessage> sentMessages = new HashSet<>();
    
    @OneToMany(mappedBy = "receiver", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    @Builder.Default
    private Set<DirectMessage> receivedMessages = new HashSet<>();
    
    @OneToMany(mappedBy = "user", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    @Builder.Default
    private Set<Notification> notifications = new HashSet<>();
    
    @OneToMany(mappedBy = "user", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    @Builder.Default
    private Set<UserSession> sessions = new HashSet<>();

   
}
