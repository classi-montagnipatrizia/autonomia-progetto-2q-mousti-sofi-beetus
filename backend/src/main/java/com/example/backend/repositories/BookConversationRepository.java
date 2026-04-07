package com.example.backend.repositories;

import com.example.backend.models.BookConversation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface BookConversationRepository extends JpaRepository<BookConversation, Long> {

    /**
     * Trova la conversazione tra un buyer e un libro specifico.
     */
    @Query("""
            SELECT c FROM BookConversation c
            JOIN FETCH c.book
            JOIN FETCH c.seller
            JOIN FETCH c.buyer
            WHERE c.book.id = :bookId AND c.buyer.id = :buyerId
            """)
    Optional<BookConversation> findByBookIdAndBuyerId(@Param("bookId") Long bookId,
                                                      @Param("buyerId") Long buyerId);

    /**
     * Lista conversazioni dell'utente (come seller o buyer), ordinate per ultimo messaggio.
     */
    @Query("""
            SELECT c FROM BookConversation c
            JOIN FETCH c.book
            JOIN FETCH c.seller
            JOIN FETCH c.buyer
            WHERE c.seller.id = :userId OR c.buyer.id = :userId
            ORDER BY c.lastMessageAt DESC NULLS LAST
            """)
    List<BookConversation> findByUserIdOrderByLastMessageAtDesc(@Param("userId") Long userId);

    /**
     * Conversazione con dettagli caricati.
     */
    @Query("""
            SELECT c FROM BookConversation c
            JOIN FETCH c.book
            JOIN FETCH c.seller
            JOIN FETCH c.buyer
            WHERE c.id = :convId
            """)
    Optional<BookConversation> findByIdWithDetails(@Param("convId") Long convId);

    /**
     * Trova tutti gli ID delle conversazioni di un libro (per eliminazione a cascata).
     */
    @Query("SELECT c.id FROM BookConversation c WHERE c.book.id = :bookId")
    List<Long> findIdsByBookId(@Param("bookId") Long bookId);

    /**
     * Conversazioni dove l'utente è buyer o seller (per eliminazione utente).
     */
    @Query("SELECT c FROM BookConversation c WHERE c.seller.id = :userId OR c.buyer.id = :userId")
    List<BookConversation> findByUserId(@Param("userId") Long userId);
}
