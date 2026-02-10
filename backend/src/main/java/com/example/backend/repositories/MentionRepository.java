package com.example.backend.repositories;

import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.example.backend.models.Mention;
import com.example.backend.models.MentionableType;

import java.util.List;

@Repository
public interface MentionRepository extends JpaRepository<Mention, Long> {

    // Menzioni per un utente
    List<Mention> findByMentionedUserIdOrderByCreatedAtDesc(Long userId);

    // Menzioni in un post
    List<Mention> findByMentionableTypeAndMentionableId(MentionableType type, Long id);

    // Verifica se utente è menzionato in un contenuto
    boolean existsByMentionedUserIdAndMentionableTypeAndMentionableId(
        Long userId, MentionableType type, Long id);

    // Menzioni recenti con contesto
    @Query("""
        SELECT m FROM Mention m
        JOIN FETCH m.mentionedUser
        JOIN FETCH m.mentioningUser
        WHERE m.mentionedUser.id = :userId
        ORDER BY m.createdAt DESC
        """)
    List<Mention> findRecentMentionsWithUsers(Long userId, Pageable pageable);

    //Tutte le menzioni (senza limite)
    @Query("""
        SELECT m FROM Mention m
        JOIN FETCH m.mentionedUser
        JOIN FETCH m.mentioningUser
        WHERE m.mentionedUser.id = :userId
        ORDER BY m.createdAt DESC
        """)
    List<Mention> findRecentMentionsWithUsers(@Param("userId") Long userId);

    // Elimina menzioni quando il contenuto viene cancellato
    void deleteByMentionableTypeAndMentionableId(MentionableType type, Long id);

    /**
     * Elimina tutte le menzioni dove l'utente è menzionato o è chi menziona.
     * Necessario per eliminazione account.
     */
    @Modifying
    @Query("DELETE FROM Mention m WHERE m.mentionedUser.id = :userId OR m.mentioningUser.id = :userId")
    void deleteByUserId(@Param("userId") Long userId);
}