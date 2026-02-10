package com.example.backend.repositories;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.example.backend.models.User;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {

    // SICUREZZA: Filtra solo utenti attivi per prevenire accesso a account disabilitati
    Optional<User> findByUsernameAndIsActiveTrue(String username);
    Optional<User> findByEmailAndIsActiveTrue(String email);
    
    // Query senza filtro isActive (per uso interno/admin)
    Optional<User> findByUsername(String username);
    Optional<User> findByEmail(String email);
    boolean existsByUsername(String username);
    boolean existsByEmail(String email);

    // Conta tutti gli utenti (incluso admin)
    long count();

    // Conta solo utenti attivi (ottimizzato - evita N+1 query)
    long countByIsActiveTrue();

    // Trova l'admin
    Optional<User> findByIsAdminTrue();

    // Trova utenti attivi
    List<User> findByIsActiveTrue();

    // Trova utenti online
    @Query("""
        SELECT DISTINCT u FROM User u
        JOIN u.sessions s
        WHERE s.isOnline = true 
        AND s.lastActivity > :threshold
        """)
    List<User> findOnlineUsers(@Param("threshold") LocalDateTime threshold);
    
    /**
     * Carica utenti con eager fetch per ottimizzare N+1 query.
     * Usato in ottieniConversazioni per caricare sender/receiver in una query.
     */
    @Query("""
        SELECT u FROM User u
        WHERE u.id IN :userIds
        """)
    List<User> findByIdIn(@Param("userIds") List<Long> userIds);

    /**
     * Ricerca utenti per username (autocomplete menzioni).
     * Cerca solo utenti il cui username inizia con il prefisso fornito.
     * Utile per l'autocomplete quando si digita @ seguito da lettere.
     * <p>
     * PERFORMANCE: Usa Pageable per limitare i risultati direttamente nel DB
     * invece di caricare tutti gli utenti e limitare in Java.
     *
     * @param prefix Il prefisso da cercare
     * @param pageable Parametri di paginazione (usa PageRequest.of(0, 10) per primi 10)
     * @return Lista di utenti che matchano il prefisso
     */
    @Query("SELECT u FROM User u WHERE u.isActive = true AND LOWER(u.username) LIKE LOWER(CONCAT(:prefix, '%')) ORDER BY u.username")
    List<User> findByUsernameStartingWith(@Param("prefix") String prefix, Pageable pageable);

    /**
     * Trova utenti per una lista di username.
     * Utile per processare le menzioni: dato un set di @username,
     * recupera tutti gli User corrispondenti.
     */
    @Query("SELECT u FROM User u WHERE LOWER(u.username) IN :usernames AND u.isActive = true")
    List<User> findByUsernameIn(@Param("usernames") java.util.Set<String> usernames);

    /**
     * Ricerca avanzata di utenti per username o nome completo.
     * La ricerca è case-insensitive e cerca in entrambi i campi.
     * Restituisce risultati paginati per gestire liste di utenti lunghe.
     *
     *
     * Questa query cerca la stringa ovunque nel campo (inizio, mezzo, fine).
     * Utile per la barra di ricerca generale dell'applicazione.
     */
    @Query("""
        SELECT u FROM User u
        WHERE u.isActive = true
        AND (
            LOWER(u.username) LIKE LOWER(CONCAT('%', :searchTerm, '%'))
            OR LOWER(u.fullName) LIKE LOWER(CONCAT('%', :searchTerm, '%'))
        )
        ORDER BY u.username ASC
        """)
    Page<User> searchUsers(@Param("searchTerm") String searchTerm, Pageable pageable);

    /**
     * Ricerca utenti per username o nome completo (versione per admin).
     * Cerca in tutti gli utenti, inclusi quelli disabilitati.
     * Case-insensitive.
     */
    @Query("""
        SELECT u FROM User u
        WHERE LOWER(u.username) LIKE LOWER(CONCAT('%', :query, '%'))
        OR LOWER(u.fullName) LIKE LOWER(CONCAT('%', :query, '%'))
        ORDER BY u.username ASC
        """)
    Page<User> searchByUsernameOrFullName(@Param("query") String query, Pageable pageable);

    /**
     * Trova tutti gli utenti attivi con paginazione.
     * Ordinati alfabeticamente per username.
     * Utile per mostrare la lista completa degli studenti della classe.
     */
    @Query("SELECT u FROM User u WHERE u.isActive = true ORDER BY u.username ASC")
    Page<User> findAllActiveUsers(Pageable pageable);

    /**
     * Trova tutti gli utenti attivi della stessa classe con paginazione.
     * Filtra per classroom per garantire isolamento tra classi.
     */
    @Query("SELECT u FROM User u WHERE u.isActive = true AND u.classroom = :classroom ORDER BY u.username ASC")
    Page<User> findAllActiveUsersByClassroom(@Param("classroom") String classroom, Pageable pageable);

    /**
     * Ricerca utenti per username o nome completo, filtrata per classe.
     * Garantisce che gli studenti vedano solo i compagni di classe nei risultati.
     */
    @Query("""
        SELECT u FROM User u
        WHERE u.isActive = true
        AND u.classroom = :classroom
        AND (
            LOWER(u.username) LIKE LOWER(CONCAT('%', :searchTerm, '%'))
            OR LOWER(u.fullName) LIKE LOWER(CONCAT('%', :searchTerm, '%'))
        )
        ORDER BY u.username ASC
        """)
    Page<User> searchUsersByClassroom(@Param("searchTerm") String searchTerm, @Param("classroom") String classroom, Pageable pageable);

    /**
     * Trova utenti online della stessa classe.
     */
    @Query("""
        SELECT DISTINCT u FROM User u
        JOIN u.sessions s
        WHERE s.isOnline = true
        AND s.lastActivity > :threshold
        AND u.classroom = :classroom
        """)
    List<User> findOnlineUsersByClassroom(@Param("threshold") LocalDateTime threshold, @Param("classroom") String classroom);

    /**
     * Conta i post creati da un utente specifico.
     * Utile per mostrare statistiche nel profilo.
     */
    @Query("SELECT COUNT(p) FROM Post p WHERE p.user.id = :userId AND p.isDeletedByAuthor = false")
    long countPostsByUserId(@Param("userId") Long userId);

    /**
     * Conta i commenti scritti da un utente specifico.
     * Include sia commenti principali che risposte.
     */
    @Query("SELECT COUNT(c) FROM Comment c WHERE c.user.id = :userId AND c.isDeletedByAuthor = false")
    long countCommentsByUserId(@Param("userId") Long userId);

    /**
     * Conta quanti like totali hanno ricevuto i post di un utente.
     * Questa è una metrica importante per il profilo: mostra quanto è apprezzato il contenuto dell'utente.
     */
    @Query("SELECT SUM(p.likesCount) FROM Post p WHERE p.user.id = :userId AND p.isDeletedByAuthor = false")
    Long countTotalLikesReceivedByUserId(@Param("userId") Long userId);


    /**
     * Verifica se esiste un utente con l'ID specificato e profilePictureUrl.
     * Usato per verificare ownership prima di eliminare un'immagine del profilo.
     */
    boolean existsByIdAndProfilePictureUrl(Long id, String profilePictureUrl);

    /**
     * Trova un utente tramite l'URL dell'immagine del profilo.
     * Usato per rimuovere il riferimento all'immagine dopo l'eliminazione.
     */
    Optional<User> findByProfilePictureUrl(String profilePictureUrl);

    /**
     * Elimina un utente per ID senza caricare l'entità.
     * Evita ConcurrentModificationException durante cascade su collezioni lazy.
     */
    @Modifying
    @Query("DELETE FROM User u WHERE u.id = :userId")
    int deleteByUserId(@Param("userId") Long userId);
}