package com.example.backend.repositories;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.example.backend.models.Post;

import java.util.List;
import java.util.Optional;

@Repository
public interface PostRepository extends JpaRepository<Post, Long> {

    // Post visibili per un utente (non cancellati e non nascosti)
    @Query("""
            SELECT p FROM Post p
            WHERE p.isDeletedByAuthor = false
            AND NOT EXISTS (
                SELECT hp FROM HiddenPost hp
                WHERE hp.post.id = p.id AND hp.user.id = :userId
            )
            ORDER BY p.createdAt DESC
            """)
    Page<Post> findVisiblePostsForUser(@Param("userId") Long userId, Pageable pageable);

    /**
     * Post visibili per un utente, filtrati per classe.
     * Mostra solo post di utenti della stessa classe.
     */
    @Query("""
            SELECT p FROM Post p
            WHERE p.isDeletedByAuthor = false
            AND p.user.classroom = :classroom
            AND NOT EXISTS (
                SELECT hp FROM HiddenPost hp
                WHERE hp.post.id = p.id AND hp.user.id = :userId
            )
            ORDER BY p.createdAt DESC
            """)
    Page<Post> findVisiblePostsForUserByClassroom(@Param("userId") Long userId, @Param("classroom") String classroom, Pageable pageable);

    // Post di un utente specifico
    Page<Post> findByUserIdAndIsDeletedByAuthorFalseOrderByCreatedAtDesc(Long userId, Pageable pageable);

    /**
     * Carica un singolo post con tutti i dettagli necessari in una sola query.
     * Usa JOIN FETCH per caricare eagerly l'autore del post, i commenti principali
     * ,
     * gli autori dei commenti e le risposte ai commenti. Questo evita il problema
     * N+1.
     * DISTINCT è necessario perché JOIN FETCH su collezioni può creare duplicati
     * nel result set.
     * 
     * @param postId L'ID del post
     * @return Optional contenente il post con dettagli, o empty se non trovato
     */
    @Query("""
            SELECT DISTINCT p FROM Post p
            LEFT JOIN FETCH p.user
            LEFT JOIN FETCH p.comments c
            LEFT JOIN FETCH c.user
            WHERE p.id = :postId
            AND p.isDeletedByAuthor = false
            """)
    Optional<Post> findByIdWithDetails(@Param("postId") Long postId);

    /**
     * Ricerca full-text nei post. Cerca sia nel contenuto del post che nello
     * username dell'autore.
     * La ricerca è case-insensitive grazie a LOWER() e utilizza LIKE con % per
     * matching parziale.
     * 
     * SICUREZZA: I caratteri speciali LIKE (%, _) nel searchTerm sono gestiti
     * dal parametrizzato di JPA che previene SQL injection.
     * Per prevenire wildcard injection, usare escape nel service layer se necessario.
     */
    @Query("""
            SELECT p FROM Post p
            WHERE p.isDeletedByAuthor = false
            AND (
                LOWER(p.content) LIKE LOWER(CONCAT('%', :searchTerm, '%'))
                OR LOWER(p.user.username) LIKE LOWER(CONCAT('%', :searchTerm, '%'))
                OR LOWER(p.user.fullName) LIKE LOWER(CONCAT('%', :searchTerm, '%'))
            )
            ORDER BY p.createdAt DESC
            """)
    Page<Post> searchPosts(@Param("searchTerm") String searchTerm, Pageable pageable);

    /**
     * Ricerca full-text nei post, filtrata per classe.
     * Cerca sia nel contenuto del post che nello username/nome dell'autore,
     * ma solo tra i post degli utenti della stessa classe.
     */
    @Query("""
            SELECT p FROM Post p
            WHERE p.isDeletedByAuthor = false
            AND p.user.classroom = :classroom
            AND (
                LOWER(p.content) LIKE LOWER(CONCAT('%', :searchTerm, '%'))
                OR LOWER(p.user.username) LIKE LOWER(CONCAT('%', :searchTerm, '%'))
                OR LOWER(p.user.fullName) LIKE LOWER(CONCAT('%', :searchTerm, '%'))
            )
            ORDER BY p.createdAt DESC
            """)
    Page<Post> searchPostsByClassroom(@Param("searchTerm") String searchTerm, @Param("classroom") String classroom, Pageable pageable);

    /**
     * Conta il numero totale di post pubblicati da un utente.
     * Utile per mostrare statistiche nel profilo utente.
     */
    @Query("SELECT COUNT(p) FROM Post p WHERE p.user.id = :userId AND p.isDeletedByAuthor = false")
    long countByUserId(@Param("userId") Long userId);

    /**
     * Carica un post con l'autore già caricato (JOIN FETCH).
     * Utile per evitare LazyInitializationException in contesti async.
     * 
     * @param postId L'ID del post
     * @return Optional contenente il post con autore, o empty se non trovato
     */
    @Query("""
            SELECT p FROM Post p
            LEFT JOIN FETCH p.user
            WHERE p.id = :postId
            """)
    Optional<Post> findByIdWithUser(@Param("postId") Long postId);

    /**
     * Trova i post più recenti di un utente specifico, visibili per l'utente che
     * sta guardando.
     * Questa query è diversa da
     * findByUserIdAndIsDeletedByAuthorFalseOrderByCreatedAtDesc
     * perché filtra anche i post che l'utente corrente ha nascosto.
     */
    @Query("""
            SELECT p FROM Post p
            WHERE p.user.id = :authorId
            AND p.isDeletedByAuthor = false
            AND NOT EXISTS (
                SELECT hp FROM HiddenPost hp
                WHERE hp.post.id = p.id AND hp.user.id = :currentUserId
            )
            ORDER BY p.createdAt DESC
            """)
    Page<Post> findVisiblePostsByUser(
            @Param("authorId") Long authorId,
            @Param("currentUserId") Long currentUserId,
            Pageable pageable);

    // Aggiorna contatore likes atomicamente
    @Modifying
    @Query("UPDATE Post p SET p.likesCount = p.likesCount + :delta WHERE p.id = :postId")
    void updateLikesCount(@Param("postId") Long postId, @Param("delta") Integer delta);

    // Aggiorna contatore commenti atomicamente
    @Modifying
    @Query("UPDATE Post p SET p.commentsCount = p.commentsCount + :delta WHERE p.id = :postId")
    void updateCommentsCount(@Param("postId") Long postId, @Param("delta") Integer delta);

    /**
     * Sincronizza atomicamente il contatore dei like con il conteggio reale dalla
     * tabella likes.
     * Questa query è completamente atomica e thread-safe - conta e aggiorna in una
     * sola operazione.
     *
     * @param postId L'ID del post da sincronizzare
     */
    @Modifying
    @Query("""
            UPDATE Post p
            SET p.likesCount = (SELECT COUNT(l) FROM Like l WHERE l.post.id = :postId)
            WHERE p.id = :postId
            """)
    void syncLikesCount(@Param("postId") Long postId);

    /**
     * Sincronizza atomicamente il contatore dei commenti con il conteggio reale
     * dalla tabella comments.
     * Questa query è completamente atomica e thread-safe - conta e aggiorna in una
     * sola operazione.
     *
     * @param postId L'ID del post da sincronizzare
     */
    @Modifying
    @Query("""
            UPDATE Post p
            SET p.commentsCount = (SELECT COUNT(c) FROM Comment c WHERE c.post.id = :postId AND c.isDeletedByAuthor = false)
            WHERE p.id = :postId
            """)
    void syncCommentsCount(@Param("postId") Long postId);

    /**
     * Trova tutti i post di un utente (per eliminazione account).
     */
    List<Post> findByUserId(Long userId);

    /**
     * Verifica se esiste un post con l'immagine specificata appartenente all'utente.
     * Usato per verificare ownership prima di eliminare un'immagine.
     */
    boolean existsByImageUrlAndUserId(String imageUrl, Long userId);

    /**
     * Trova un post tramite l'URL dell'immagine.
     * Usato per rimuovere il riferimento all'immagine dopo l'eliminazione.
     */
    Optional<Post> findByImageUrl(String imageUrl);
}