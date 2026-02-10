package com.example.backend.repositories;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.example.backend.models.Like;
import com.example.backend.models.User;

import java.util.List;
import java.util.Optional;

@Repository
public interface LikeRepository extends JpaRepository<Like, Long> {

    // Verifica se un utente ha messo like a un post
    boolean existsByUserIdAndPostId(Long userId, Long postId);

    // Trova like specifico
    Optional<Like> findByUserIdAndPostId(Long userId, Long postId);

    /**
     * Rimuove un like specifico e restituisce il numero di righe cancellate.
     * Questo è thread-safe e permette di sapere se il like esisteva o meno.
     *
     * @return 1 se il like è stato cancellato, 0 se non esisteva
     */
    @Modifying
    @Query("DELETE FROM Like l WHERE l.user.id = :userId AND l.post.id = :postId")
    int deleteByUserIdAndPostId(@Param("userId") Long userId, @Param("postId") Long postId);

    // Conta likes per post
    long countByPostId(Long postId);

    // Utenti che hanno messo like (lista semplice)
    @Query("SELECT l.user FROM Like l WHERE l.post.id = :postId")
    List<User> findUsersWhoLikedPost(@Param("postId") Long postId);

    /**
     *Query paginata per ottenere gli utenti che hanno messo like a un post.
     *
     * Ordinamento per data di creazione del like: i like più recenti appaiono per primi.
     */
    @Query("SELECT l.user FROM Like l WHERE l.post.id = :postId ORDER BY l.createdAt DESC")
    Page<User> findUsersWhoLikedPostPaginated(@Param("postId") Long postId, Pageable pageable);

    /**
     * Trova tutti i like di un post con i dettagli completi.
     * Utile quando per mostrare non solo chi ha messo like, ma anche quando l'ha fatto.
     *  Con ordinamento per data.
     */
    @Query("SELECT l FROM Like l WHERE l.post.id = :postId ORDER BY l.createdAt DESC")
    Page<Like> findLikesByPostIdPaginated(@Param("postId") Long postId, Pageable pageable);

    // Trova tutti i like di un utente
    List<Like> findByUserId(Long userId);

    /**
     * Elimina tutti i like di un utente in un'operazione bulk atomica.
     * Più efficiente di cancellare uno alla volta.
     *
     * @return Il numero di like eliminati
     */
    @Modifying
    @Query("DELETE FROM Like l WHERE l.user.id = :userId")
    int deleteAllByUserId(@Param("userId") Long userId);

    /**
     * Ottiene tutti i post_id che hanno ricevuto like da un utente.
     * Utile per ricalcolare i contatori dopo eliminazione bulk.
     */
    @Query("SELECT DISTINCT l.post.id FROM Like l WHERE l.user.id = :userId")
    List<Long> findPostIdsByUserId(@Param("userId") Long userId);

    /**
     * Elimina tutti i like di un post.
     * Viene usato quando un post viene eliminato.
     *
     * @return Il numero di like eliminati
     */
    @Modifying
    @Query("DELETE FROM Like l WHERE l.post.id = :postId")
    int deleteAllByPostId(@Param("postId") Long postId);
}