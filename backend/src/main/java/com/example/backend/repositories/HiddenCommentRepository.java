package com.example.backend.repositories;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.example.backend.models.HiddenComment;

import java.util.Optional;
import java.util.Set;

@Repository
public interface HiddenCommentRepository extends JpaRepository<HiddenComment, Long> {

    // Verifica se un commento è nascosto per un utente
    boolean existsByCommentIdAndUserId(Long commentId, Long userId);

    // Trova record specifico
    Optional<HiddenComment> findByCommentIdAndUserId(Long commentId, Long userId);

    // Rimuovi nascondimento
    void deleteByCommentIdAndUserId(Long commentId, Long userId);

    // Conta quanti utenti hanno nascosto un commento
    long countByCommentId(Long commentId);

    // Ottieni tutti gli ID dei commenti nascosti da un utente (evita N+1)
    @Query("SELECT hc.comment.id FROM HiddenComment hc WHERE hc.user.id = :userId")
    Set<Long> findHiddenCommentIdsByUserId(@Param("userId") Long userId);

    /**
     * Elimina tutti i record di commenti nascosti per un utente.
     * Necessario per eliminazione account.
     */
    @Modifying
    @Query("DELETE FROM HiddenComment hc WHERE hc.user.id = :userId")
    void deleteByUserId(@Param("userId") Long userId);

    /**
     * Elimina tutti i record di commenti nascosti relativi ai commenti di un utente.
     * Necessario prima di eliminare i commenti dell'utente.
     */
    @Modifying
    @Query("DELETE FROM HiddenComment hc WHERE hc.comment.id IN (SELECT c.id FROM Comment c WHERE c.user.id = :userId)")
    void deleteByCommentUserId(@Param("userId") Long userId);
}
