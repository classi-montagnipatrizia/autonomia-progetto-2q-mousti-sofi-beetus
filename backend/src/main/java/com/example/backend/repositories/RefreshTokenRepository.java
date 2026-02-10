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
    
    // Trova per token
    Optional<RefreshToken> findByToken(String token);
    
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
    
    // Verifica esistenza token valido
    @Query("""
        SELECT CASE WHEN COUNT(rt) > 0 THEN true ELSE false END
        FROM RefreshToken rt
        WHERE rt.token = :token AND rt.expiresAt > :now
        """)
    boolean isTokenValid(@Param("token") String token, @Param("now") LocalDateTime now);
    
    /**
     * Trova tutti i refresh token non scaduti.
     * PERFORMANCE: Ottimizzato per verificaRefreshToken, carica solo token validi.
     * Per 17 utenti, performance accettabile. Per più utenti, considerare indice su expiresAt.
     */
    @Query("SELECT rt FROM RefreshToken rt WHERE rt.expiresAt > :now")
    java.util.List<RefreshToken> findAllValid(@Param("now") LocalDateTime now);
}
