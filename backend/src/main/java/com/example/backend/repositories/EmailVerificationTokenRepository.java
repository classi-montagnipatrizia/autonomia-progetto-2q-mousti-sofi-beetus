package com.example.backend.repositories;

import com.example.backend.models.EmailVerificationToken;
import com.example.backend.models.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.Optional;

@Repository
public interface EmailVerificationTokenRepository extends JpaRepository<EmailVerificationToken, Long> {

    /**
     * Trova un token tramite la stringa del token
     */
    Optional<EmailVerificationToken> findByToken(String token);

    /**
     * Trova l'ultimo token non verificato per un utente
     */
    Optional<EmailVerificationToken> findFirstByUserAndVerifiedFalseOrderByCreatedAtDesc(User user);

    /**
     * Trova tutti i token per un utente
     */
    @Query("SELECT t FROM EmailVerificationToken t WHERE t.user = :user ORDER BY t.createdAt DESC")
    java.util.List<EmailVerificationToken> findByUser(User user);

    /**
     * Elimina tutti i token scaduti
     */
    @Modifying
    @Query("DELETE FROM EmailVerificationToken t WHERE t.expiryDate < :now")
    int deleteExpiredTokens(LocalDateTime now);

    /**
     * Elimina tutti i token verificati più vecchi di X giorni
     */
    @Modifying
    @Query("DELETE FROM EmailVerificationToken t WHERE t.verified = true AND t.createdAt < :date")
    int deleteOldVerifiedTokens(LocalDateTime date);

    /**
     * Conta token non verificati per un utente
     */
    long countByUserAndVerifiedFalse(User user);

    /**
     * Elimina tutti i token di un utente per ID
     */
    @Modifying
    @Query("DELETE FROM EmailVerificationToken t WHERE t.user.id = :userId")
    void deleteByUserId(Long userId);
}
