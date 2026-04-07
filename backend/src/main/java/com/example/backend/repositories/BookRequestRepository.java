package com.example.backend.repositories;

import com.example.backend.models.BookRequest;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface BookRequestRepository extends JpaRepository<BookRequest, Long> {

    @Query("SELECT br FROM BookRequest br JOIN FETCH br.buyer WHERE br.book.id = :bookId ORDER BY br.createdAt ASC")
    List<BookRequest> findByBookIdWithBuyer(@Param("bookId") Long bookId);

    @Query("SELECT br FROM BookRequest br WHERE br.book.id = :bookId AND br.buyer.id = :buyerId")
    Optional<BookRequest> findByBookIdAndBuyerId(@Param("bookId") Long bookId, @Param("buyerId") Long buyerId);

    @Query("SELECT COUNT(br) FROM BookRequest br WHERE br.book.id = :bookId AND br.status = 'PENDING'")
    long countPendingByBookId(@Param("bookId") Long bookId);

    @Query("SELECT br FROM BookRequest br JOIN FETCH br.buyer WHERE br.book.id = :bookId AND br.status = 'PENDING'")
    List<BookRequest> findPendingByBookId(@Param("bookId") Long bookId);

    @Modifying
    @Query("DELETE FROM BookRequest br WHERE br.book.id = :bookId")
    void deleteByBookId(@Param("bookId") Long bookId);

    @Modifying
    @Query("DELETE FROM BookRequest br WHERE br.buyer.id = :userId")
    void deleteByBuyerId(@Param("userId") Long userId);
}
