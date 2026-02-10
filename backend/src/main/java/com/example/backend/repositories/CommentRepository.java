package com.example.backend.repositories;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.example.backend.models.Comment;

import java.util.List;
import java.util.Optional;

@Repository
public interface CommentRepository extends JpaRepository<Comment, Long> {

    /**
     * Carica un commento con il suo autore (eager loading per evitare LazyInitializationException)
     */
    @Query("SELECT c FROM Comment c JOIN FETCH c.user WHERE c.id = :commentId")
    Optional<Comment> findByIdWithUser(@Param("commentId") Long commentId);

    // Commenti visibili per un post
    @Query("""
        SELECT c FROM Comment c
        WHERE c.post.id = :postId
        AND c.isDeletedByAuthor = false
        AND NOT EXISTS (
            SELECT hc FROM HiddenComment hc 
            WHERE hc.comment.id = c.id AND hc.user.id = :userId
        )
        ORDER BY c.createdAt ASC
        """)
    List<Comment> findVisibleCommentsForPost(@Param("postId") Long postId, @Param("userId") Long userId);

    // Commenti principali con user eager-loaded (evita N+1)
    @Query("""
        SELECT c FROM Comment c
        JOIN FETCH c.user
        WHERE c.post.id = :postId
        AND c.parentComment IS NULL
        AND c.isDeletedByAuthor = false
        ORDER BY c.createdAt ASC
        """)
    List<Comment> findRootCommentsByPostId(@Param("postId") Long postId);

    // Carica tutte le risposte per una lista di commenti parent con user eager-loaded (evita N+1)
    @Query("""
        SELECT c FROM Comment c
        JOIN FETCH c.user
        WHERE c.parentComment.id IN :parentIds
        AND c.isDeletedByAuthor = false
        ORDER BY c.createdAt ASC
        """)
    List<Comment> findChildCommentsByParentIds(@Param("parentIds") List<Long> parentIds);

    // Risposte a un commento
    List<Comment> findByParentCommentIdAndIsDeletedByAuthorFalseOrderByCreatedAtAsc(Long parentCommentId);

    // Conta commenti per post
    long countByPostIdAndIsDeletedByAuthorFalse(Long postId);

    /**
     * Conta i commenti totali scritti da un utente.
     * Include sia commenti principali che risposte.
     * Utile per mostrare statistiche nel profilo utente.
     */
    @Query("SELECT COUNT(c) FROM Comment c WHERE c.user.id = :userId AND c.isDeletedByAuthor = false")
    long countByUserId(@Param("userId") Long userId);
    /**
     * Trova tutti i commenti di un utente (per eliminazione account).
     */
    List<Comment> findByUserId(Long userId);

    /**
     * Trova tutti i commenti di un post (per eliminazione post).
     */
    List<Comment> findByPostId(Long postId);

    /**
     * Conta i commenti totali non eliminati nel sistema.
     * Utile per statistiche admin.
     */
    long countByIsDeletedByAuthorFalse();

    /**
     * Trova tutti i commenti figli di un commento parent.
     * Include anche quelli soft-deleted per poterli eliminare ricorsivamente.
     */
    @Query("SELECT c FROM Comment c WHERE c.parentComment.id = :parentId")
    List<Comment> findAllChildCommentsByParentId(@Param("parentId") Long parentId);
}