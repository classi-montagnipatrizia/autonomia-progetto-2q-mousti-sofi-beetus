package com.example.backend.repositories;

import com.example.backend.models.BookMessage;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface BookMessageRepository extends JpaRepository<BookMessage, Long> {

    /**
     * Messaggi di una conversazione, paginati, ordinati per data.
     */
    @Query("""
            SELECT m FROM BookMessage m
            JOIN FETCH m.sender
            WHERE m.conversation.id = :convId
            ORDER BY m.createdAt ASC
            """)
    Page<BookMessage> findByConversationId(@Param("convId") Long convId, Pageable pageable);

    /**
     * Conta i messaggi non letti in una conversazione per un utente specifico.
     * (messaggi che NON sono stati inviati dall'utente e che non sono letti)
     */
    @Query("""
            SELECT COUNT(m) FROM BookMessage m
            WHERE m.conversation.id = :convId
            AND m.sender.id <> :userId
            AND m.isRead = false
            """)
    int countUnreadByConversationIdAndUserId(@Param("convId") Long convId,
                                             @Param("userId") Long userId);

    /**
     * Segna come letti tutti i messaggi non inviati dall'utente in una conversazione.
     */
    @Modifying
    @Query("""
            UPDATE BookMessage m
            SET m.isRead = true
            WHERE m.conversation.id = :convId
            AND m.sender.id <> :userId
            AND m.isRead = false
            """)
    int markAsReadByConversationIdAndUserId(@Param("convId") Long convId,
                                            @Param("userId") Long userId);

    /**
     * Trova l'ultimo messaggio di una conversazione.
     */
    @Query("""
            SELECT m FROM BookMessage m
            JOIN FETCH m.sender
            WHERE m.conversation.id = :convId
            ORDER BY m.createdAt DESC
            LIMIT 1
            """)
    BookMessage findLastByConversationId(@Param("convId") Long convId);

    /**
     * Elimina tutti i messaggi di una conversazione (usato prima di eliminare la conversazione).
     */
    @Modifying
    void deleteByConversationId(Long conversationId);
}
