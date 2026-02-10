package com.example.backend.models;

import jakarta.persistence.*;
import lombok.*;
import java.util.HashSet;
import java.util.Set;

@Entity
@Table(name = "comments",
    indexes = {
        @Index(name = "idx_post_id", columnList = "post_id"),
        @Index(name = "idx_user_id", columnList = "user_id"),
        @Index(name = "idx_comments_post_not_deleted", columnList = "post_id, is_deleted_by_author, created_at")
    })
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@EqualsAndHashCode(callSuper = true, exclude = {"childComments", "hiddenByUsers", "parentComment", "post", "user"})
@ToString(exclude = {"childComments", "hiddenByUsers", "parentComment", "post", "user"})
public class Comment extends BaseEntity {
    
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "post_id", nullable = false)
    private Post post;
    
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "parent_comment_id")
    private Comment parentComment;
    
    @Column(columnDefinition = "TEXT", nullable = false)
    private String content;
    
    @Column(name = "is_deleted_by_author", nullable = false)
    @Builder.Default
    private Boolean isDeletedByAuthor = false;
    
    // Relazioni
    @OneToMany(mappedBy = "parentComment", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    @Builder.Default
    private Set<Comment> childComments = new HashSet<>();
    
    @OneToMany(mappedBy = "comment", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    @Builder.Default
    private Set<HiddenComment> hiddenByUsers = new HashSet<>();
    
    // Helper method per verificare se è nascosto per un utente
    @Transient
    public boolean isHiddenForUser(Long userId) {
        return hiddenByUsers.stream().anyMatch(hc -> hc.getUser().getId().equals(userId));
    }
}
