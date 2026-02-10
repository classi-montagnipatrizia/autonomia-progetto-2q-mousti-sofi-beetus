package com.example.backend.repositories;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.example.backend.models.User;
import com.example.backend.models.UserSession;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.Set;

@Repository
public interface UserSessionRepository extends JpaRepository<UserSession, Long> {
    
    // Trova per session ID
    Optional<UserSession> findBySessionId(String sessionId);
    
    // Sessioni attive di un utente
    List<UserSession> findByUserIdAndIsOnlineTrue(Long userId);
    
    // Utenti online
    @Query("""
        SELECT DISTINCT us.user FROM UserSession us
        WHERE us.isOnline = true 
        AND us.lastActivity > :threshold
        """)
    List<User> findOnlineUsers(@Param("threshold") LocalDateTime threshold);
    
    // Conta utenti online
    @Query("""
        SELECT COUNT(DISTINCT us.user.id) FROM UserSession us
        WHERE us.isOnline = true 
        AND us.lastActivity > :threshold
        """)
    long countOnlineUsers(@Param("threshold") LocalDateTime threshold);
    
    // Aggiorna attività
    @Modifying
    @Query("""
        UPDATE UserSession us 
        SET us.lastActivity = :now, us.isOnline = true 
        WHERE us.sessionId = :sessionId
        """)
    void updateActivity(@Param("sessionId") String sessionId, @Param("now") LocalDateTime now);
    
    // Disconnetti utente
    @Modifying
    @Query("UPDATE UserSession us SET us.isOnline = false WHERE us.user.id = :userId")
    void disconnectUser(@Param("userId") Long userId);
    
    // Pulisci sessioni inattive
    @Modifying
    @Query("DELETE FROM UserSession us WHERE us.lastActivity < :threshold")
    void deleteInactiveSessions(@Param("threshold") LocalDateTime threshold);

    /**
     * Ottiene tutti gli ID degli utenti attualmente online.
     * Usato per ottimizzazione batch invece di query singole per ogni utente.
     */
    @Query("SELECT DISTINCT us.user.id FROM UserSession us WHERE us.isOnline = true")
    Set<Long> findAllOnlineUserIds();

    /**
     * Elimina tutte le sessioni di un utente.
     * Necessario per eliminazione account.
     */
    @Modifying
    @Query("DELETE FROM UserSession us WHERE us.user.id = :userId")
    void deleteByUserId(@Param("userId") Long userId);
}
