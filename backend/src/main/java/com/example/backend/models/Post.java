package com.example.backend.models;

import jakarta.persistence.*;
import lombok.*;
import java.util.HashSet;
import java.util.Set;
import org.hibernate.annotations.SQLRestriction;

@Entity
@Table(name = "posts",
    indexes = {
        @Index(name = "idx_user_id", columnList = "user_id"),
        @Index(name = "idx_created_at", columnList = "created_at"),
        @Index(name = "idx_posts_not_deleted", columnList = "is_deleted_by_author, created_at DESC")
    })
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@EqualsAndHashCode(callSuper = true, exclude = {"comments", "likes", "hiddenByUsers"})
@ToString(exclude = {"comments", "likes", "hiddenByUsers"})
public class Post extends BaseEntity {
@ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;
    
    @Column(columnDefinition = "TEXT")
    private String content;
    
    @Column(name = "image_url", length = 500)
    private String imageUrl;
    
    @Column(name = "likes_count", nullable = false)
    @Builder.Default
    private Integer likesCount = 0;
    
    @Column(name = "comments_count", nullable = false)
    @Builder.Default
    private Integer commentsCount = 0;
    
    @Column(name = "is_deleted_by_author", nullable = false)
    @Builder.Default
    private Boolean isDeletedByAuthor = false;
    
    // Relazioni
    @OneToMany(mappedBy = "post", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    @SQLRestriction("is_deleted_by_author = false")
    @Builder.Default
    private Set<Comment> comments = new HashSet<>();
    
    @OneToMany(mappedBy = "post", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    @Builder.Default
    private Set<Like> likes = new HashSet<>();
    
    @OneToMany(mappedBy = "post", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    @Builder.Default
    private Set<HiddenPost> hiddenByUsers = new HashSet<>();
    
    // Helper method per verificare se un utente ha messo like
    @Transient
    public boolean isLikedByUser(Long userId) {
        if (userId == null) {
            return false;
        }
        return likes.stream().anyMatch(like -> like.getUser().getId().equals(userId));
    }
    
    // Helper method per verificare se è nascosto per un utente
    @Transient
    public boolean isHiddenForUser(Long userId) {
        if (userId == null) {
            return false;
        }
        return hiddenByUsers.stream().anyMatch(hp -> hp.getUser().getId().equals(userId));
    }
}
