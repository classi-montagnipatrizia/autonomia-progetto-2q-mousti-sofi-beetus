package com.example.backend.repositories;

import com.example.backend.models.Book;
import com.example.backend.models.BookStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

@Repository
public interface BookRepository extends JpaRepository<Book, Long> {

    /**
     * Libri disponibili escludendo quelli del venditore corrente.
     */
    @Query("""
            SELECT b FROM Book b
            JOIN FETCH b.seller
            WHERE b.status = 'DISPONIBILE'
            AND b.seller.id <> :userId
            ORDER BY b.createdAt DESC
            """)
    Page<Book> findAvailableBooksExcludingSeller(@Param("userId") Long userId, Pageable pageable);

    /**
     * Ricerca libri con filtri multipli.
     * Tutti i parametri sono opzionali (null = ignora filtro).
     */
    @Query("""
            SELECT b FROM Book b
            JOIN FETCH b.seller
            WHERE b.status = 'DISPONIBILE'
            AND b.seller.id <> :userId
            AND (CAST(:searchTerm AS string) IS NULL OR (
                LOWER(b.title) LIKE LOWER(CONCAT('%', CAST(:searchTerm AS string), '%'))
                OR LOWER(b.author) LIKE LOWER(CONCAT('%', CAST(:searchTerm AS string), '%'))
                OR LOWER(b.isbn) LIKE LOWER(CONCAT('%', CAST(:searchTerm AS string), '%'))
            ))
            AND (:schoolYear IS NULL OR b.schoolYear = :schoolYear)
            AND (:subject IS NULL OR b.subject = :subject)
            AND (:condition IS NULL OR b.condition = :condition)
            AND (:maxPrice IS NULL OR b.price <= :maxPrice)
            ORDER BY b.createdAt DESC
            """)
    Page<Book> searchBooks(
            @Param("userId") Long userId,
            @Param("searchTerm") String searchTerm,
            @Param("schoolYear") String schoolYear,
            @Param("subject") String subject,
            @Param("condition") String condition,
            @Param("maxPrice") BigDecimal maxPrice,
            Pageable pageable);

    /**
     * I miei annunci (tutti gli stati).
     */
    @Query("""
            SELECT b FROM Book b
            WHERE b.seller.id = :userId
            ORDER BY b.createdAt DESC
            """)
    Page<Book> findBySellerId(@Param("userId") Long userId, Pageable pageable);

    /**
     * Dettaglio libro con seller caricato.
     */
    @Query("""
            SELECT b FROM Book b
            JOIN FETCH b.seller
            WHERE b.id = :bookId
            """)
    Optional<Book> findByIdWithDetails(@Param("bookId") Long bookId);

    /**
     * Verifica se esiste un libro con l'immagine specificata appartenente al venditore.
     */
    boolean existsByFrontImageUrlAndSellerId(String frontImageUrl, Long sellerId);

    boolean existsByBackImageUrlAndSellerId(String backImageUrl, Long sellerId);

    /**
     * Ultimi 50 libri disponibili per costruire il contesto del chatbot AI.
     * Limitato per non eccedere i token limit di Gemini.
     */
    @Query("""
            SELECT b FROM Book b
            JOIN FETCH b.seller
            WHERE b.status = 'DISPONIBILE'
            ORDER BY b.createdAt DESC
            """)
    List<Book> findTop50AvailableForChatbot(Pageable pageable);

    /**
     * Tutti i libri di un venditore (per eliminazione admin).
     */
    List<Book> findBySellerId(Long sellerId);

    long countBySellerId(Long sellerId);

    /**
     * Tutti i libri con seller (per admin).
     */
    @Query("SELECT b FROM Book b JOIN FETCH b.seller ORDER BY b.createdAt DESC")
    Page<Book> findAllWithSeller(Pageable pageable);
}
