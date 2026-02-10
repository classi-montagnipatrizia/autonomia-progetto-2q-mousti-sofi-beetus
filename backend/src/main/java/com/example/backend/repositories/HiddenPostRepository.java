package com.example.backend.repositories;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.example.backend.models.HiddenPost;

import java.util.Optional;

@Repository
public interface HiddenPostRepository extends JpaRepository<HiddenPost, Long> {

    // Verifica se un post è nascosto per un utente
    boolean existsByPostIdAndUserId(Long postId, Long userId);

    // Trova record specifico
    Optional<HiddenPost> findByPostIdAndUserId(Long postId, Long userId);

    // Rimuovi nascondimento (rendi di nuovo visibile)
    void deleteByPostIdAndUserId(Long postId, Long userId);

    // Conta quanti utenti hanno nascosto un post
    long countByPostId(Long postId);

    /**
     * Elimina tutti i record di post nascosti per un utente.
     * Necessario per eliminazione account.
     */
    @Modifying
    @Query("DELETE FROM HiddenPost hp WHERE hp.user.id = :userId")
    void deleteByUserId(@Param("userId") Long userId);

    /**
     * Elimina tutti i record di post nascosti relativi ai post di un utente.
     * Necessario prima di eliminare i post dell'utente.
     */
    @Modifying
    @Query("DELETE FROM HiddenPost hp WHERE hp.post.id IN (SELECT p.id FROM Post p WHERE p.user.id = :userId)")
    void deleteByPostUserId(@Param("userId") Long userId);
}
