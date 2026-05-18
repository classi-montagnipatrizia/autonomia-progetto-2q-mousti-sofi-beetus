package com.example.backend.repositories;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.example.backend.models.RefreshToken;

import java.time.LocalDateTime;
import java.util.Optional;

@Repository
public interface RefreshTokenRepository extends JpaRepository<RefreshToken, Long> {

    /**
     * Lookup O(1) tramite UNIQUE INDEX su token_hash, filtrato per scadenza.
     * Sostituisce il vecchio findAllValid() + BCrypt.matches() iterativo (O(N)).
     */
    Optional<RefreshToken> findByTokenHashAndExpiresAtAfter(String tokenHash, LocalDateTime now);

    // Elimina token di un utente
    @Modifying
    @Query("DELETE FROM RefreshToken rt WHERE rt.user.id = :userId")
    void deleteByUserId(@Param("userId") Long userId);

    // Elimina vecchi token di un utente mantenendo uno specifico
    @Modifying
    @Query("DELETE FROM RefreshToken rt WHERE rt.user.id = :userId AND rt.id <> :keepTokenId")
    void deleteByUserIdAndIdNot(@Param("userId") Long userId, @Param("keepTokenId") Long keepTokenId);

    // Elimina token scaduti
    @Modifying
    @Query("DELETE FROM RefreshToken rt WHERE rt.expiresAt < :now")
    void deleteExpiredTokens(@Param("now") LocalDateTime now);
}
