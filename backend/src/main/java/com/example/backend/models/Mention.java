package com.example.backend.models;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "mentions",
       uniqueConstraints = @UniqueConstraint(columnNames = {"mentioned_user_id", "mentionable_type", "mentionable_id"}),
       indexes = {
        @Index(name = "idx_mentioned_user", columnList = "mentioned_user_id"),
        @Index(name = "idx_mentionable", columnList = "mentionable_type, mentionable_id")
    })
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@EqualsAndHashCode(callSuper = true, exclude = {"mentionedUser", "mentioningUser"})
@ToString(exclude = {"mentionedUser", "mentioningUser"})
public class Mention extends BaseEntity {
    
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "mentioned_user_id", nullable = false)
    private User mentionedUser;
    
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "mentioning_user_id", nullable = false)
    private User mentioningUser;
    
    @Enumerated(EnumType.STRING)
    @Column(name = "mentionable_type", nullable = false)
    private MentionableType mentionableType;
    
    @Column(name = "mentionable_id", nullable = false)
    private Long mentionableId;
    
    // Helper method per recuperare l'entità menzionata
    @Transient
    public String getMentionContext(EntityManager em) {
        return switch (mentionableType) {
            case POST -> em.find(Post.class, mentionableId).getContent();
            case COMMENT -> em.find(Comment.class, mentionableId).getContent();

        };
    }
}