package com.example.backend.repositories;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.example.backend.models.DirectMessage;

import java.util.List;

@Repository
public interface DirectMessageRepository extends JpaRepository<DirectMessage, Long> {

    // Conversazione tra due utenti (include messaggi nascosti, saranno marcati nel DTO)
    @Query("""
        SELECT dm FROM DirectMessage dm
        WHERE dm.isDeletedPermanently = false
        AND (
            (dm.sender.id = :user1Id AND dm.receiver.id = :user2Id)
            OR
            (dm.sender.id = :user2Id AND dm.receiver.id = :user1Id)
        )
        ORDER BY dm.createdAt ASC
        """)
    List<DirectMessage> findConversation(@Param("user1Id") Long user1Id, @Param("user2Id") Long user2Id);

    // Messaggi non letti per un utente
    @Query("""
        SELECT dm FROM DirectMessage dm
        WHERE dm.receiver.id = :userId
        AND dm.isRead = false
        AND dm.isDeletedPermanently = false
        AND dm.isDeletedByReceiver = false
        ORDER BY dm.createdAt DESC
        """)
    List<DirectMessage> findUnreadMessages(@Param("userId") Long userId);

    // Conta messaggi non letti
    @Query("""
        SELECT COUNT(dm) FROM DirectMessage dm
        WHERE dm.receiver.id = :userId
        AND dm.isRead = false
        AND dm.isDeletedPermanently = false
        AND dm.isDeletedByReceiver = false
        """)
    long countUnreadMessages(@Param("userId") Long userId);

    /**
     * Conta i messaggi non letti da un mittente specifico.
     * Questa query è essenziale per mostrare il conteggio dei messaggi non letti
     * per ogni conversazione nella lista delle chat.

     */
    @Query("""
        SELECT COUNT(dm) FROM DirectMessage dm
        WHERE dm.receiver.id = :receiverId
        AND dm.sender.id = :senderId
        AND dm.isRead = false
        AND dm.isDeletedPermanently = false
        AND dm.isDeletedByReceiver = false
        """)
    long countUnreadMessagesBySender(@Param("receiverId") Long receiverId, @Param("senderId") Long senderId);

    // Segna come letti
    @Modifying
    @Query("""
        UPDATE DirectMessage dm 
        SET dm.isRead = true 
        WHERE dm.receiver.id = :receiverId 
        AND dm.sender.id = :senderId
        AND dm.isRead = false
        """)
    void markMessagesAsRead(@Param("receiverId") Long receiverId, @Param("senderId") Long senderId);

    /**
     * Trova l'ultimo messaggio scambiato con ogni persona con cui l'utente ha conversato.
     * PERFORMANCE: Usa LEFT JOIN FETCH per caricare sender e receiver ed evitare N+1 query.
     */
    @Query("""
        SELECT dm FROM DirectMessage dm
        LEFT JOIN FETCH dm.sender
        LEFT JOIN FETCH dm.receiver
        WHERE dm.id IN (
            SELECT MAX(dm2.id) FROM DirectMessage dm2
            WHERE (dm2.sender.id = :userId OR dm2.receiver.id = :userId)
            AND dm2.isDeletedPermanently = false
            AND (
                (dm2.sender.id = :userId AND dm2.isDeletedBySender = false)
                OR (dm2.receiver.id = :userId AND dm2.isDeletedByReceiver = false)
            )
            GROUP BY CASE 
                WHEN dm2.sender.id = :userId THEN dm2.receiver.id 
                ELSE dm2.sender.id 
            END
        )
        ORDER BY dm.createdAt DESC
        """)
    Page<DirectMessage> findLatestConversations(@Param("userId") Long userId, Pageable pageable);
    /**
     * Trova tutti i messaggi inviati o ricevuti da un utente.
     * Usato per eliminazione account.
     */
    @Query("""
        SELECT dm FROM DirectMessage dm
        WHERE dm.sender.id = :userId OR dm.receiver.id = :userId
        """)
    List<DirectMessage> findAllByUserId(@Param("userId") Long userId);

    /**
     * Elimina tutti i messaggi in cui l'utente è mittente o destinatario.
     * Usato per l'eliminazione dell'account senza caricare le entità in memoria.
     *
     * @return numero di record eliminati
     */
    @Modifying
    @Query("DELETE FROM DirectMessage dm WHERE dm.sender.id = :userId OR dm.receiver.id = :userId")
    int deleteByUserId(@Param("userId") Long userId);

    /**
     * Cerca messaggi per contenuto (case-insensitive).
     * Cerca solo nei messaggi visibili per l'utente (esclude nascosti).
     */
    @Query("""
        SELECT dm FROM DirectMessage dm
        WHERE (dm.sender.id = :userId OR dm.receiver.id = :userId)
        AND dm.isDeletedPermanently = false
        AND (
            (dm.sender.id = :userId AND dm.isDeletedBySender = false)
            OR (dm.receiver.id = :userId AND dm.isDeletedByReceiver = false)
        )
        AND LOWER(dm.content) LIKE LOWER(CONCAT('%', :searchTerm, '%'))
        AND NOT EXISTS (
            SELECT 1 FROM HiddenMessage hm
            WHERE hm.message.id = dm.id
            AND hm.user.id = :userId
        )
        ORDER BY dm.createdAt DESC
        """)
    List<DirectMessage> searchMessagesByContent(@Param("userId") Long userId,
                                                @Param("searchTerm") String searchTerm);

    /**
     * Conta il numero di conversazioni attive (con almeno un messaggio visibile).
     */
    @Query("""
        SELECT COUNT(DISTINCT CASE 
            WHEN dm.sender.id = :userId THEN dm.receiver.id 
            ELSE dm.sender.id 
        END)
        FROM DirectMessage dm
        WHERE (dm.sender.id = :userId OR dm.receiver.id = :userId)
        AND dm.isDeletedPermanently = false
        AND (
            (dm.sender.id = :userId AND dm.isDeletedBySender = false)
            OR (dm.receiver.id = :userId AND dm.isDeletedByReceiver = false)
        )
        """)
    long countActiveConversations(@Param("userId") Long userId);

    /**
     * Trova tutti i messaggi di una conversazione senza filtri di eliminazione.
     * Usato per operazioni batch di eliminazione.
     */
    @Query("""
        SELECT dm FROM DirectMessage dm
        WHERE (dm.sender.id = :user1Id AND dm.receiver.id = :user2Id)
        OR (dm.sender.id = :user2Id AND dm.receiver.id = :user1Id)
        ORDER BY dm.createdAt ASC
        """)
    List<DirectMessage> findAllConversationMessages(@Param("user1Id") Long user1Id,
                                                    @Param("user2Id") Long user2Id);




    /**
     * Elimina permanentemente tutti i messaggi marcati come eliminati da entrambi.
     * Job di pulizia periodica.
     *
     * @return Il numero di messaggi eliminati
     */
    @Modifying
    @Query("DELETE FROM DirectMessage dm WHERE dm.isDeletedPermanently = true")
    int deletePermanentlyDeletedMessages();

    /**
     * Trova messaggi vecchi per pulizia automatica.
     * Messaggi più vecchi di X giorni e già letti.
     */
    @Query("""
        SELECT dm FROM DirectMessage dm
        WHERE dm.createdAt < :threshold
        AND dm.isRead = true
        AND dm.isDeletedPermanently = false
        """)
    List<DirectMessage> findOldReadMessages(@Param("threshold") java.time.LocalDateTime threshold);

}