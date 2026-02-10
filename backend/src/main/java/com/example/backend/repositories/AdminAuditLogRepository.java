package com.example.backend.repositories;

import com.example.backend.models.AdminAuditLog;
import com.example.backend.models.AzioneAdmin;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface AdminAuditLogRepository extends JpaRepository<AdminAuditLog, Long> {

    // Trova tutte le azioni di un admin
    Page<AdminAuditLog> findByAdminIdOrderByCreatedAtDesc(Long adminId, Pageable pageable);

    // Trova azioni per tipo
    Page<AdminAuditLog> findByAzioneOrderByCreatedAtDesc(AzioneAdmin azione, Pageable pageable);

    // Trova azioni in un periodo
    List<AdminAuditLog> findByCreatedAtBetweenOrderByCreatedAtDesc(
            LocalDateTime start, LocalDateTime end);

    // Trova azioni su un utente specifico
    List<AdminAuditLog> findByTargetUserIdOrderByCreatedAtDesc(Long targetUserId);

    // Statistiche azioni per admin
    @Query("SELECT COUNT(a) FROM AdminAuditLog a WHERE a.admin.id = :adminId")
    long countByAdminId(@Param("adminId") Long adminId);

    // Ultime N azioni
    Page<AdminAuditLog> findAllByOrderByCreatedAtDesc(Pageable pageable);

    /**
     * Imposta a NULL il riferimento target_user_id quando un utente viene eliminato.
     * Non eliminiamo i log per mantenere la tracciabilità delle azioni admin.
     */
    @Modifying
    @Query("UPDATE AdminAuditLog a SET a.targetUser = NULL WHERE a.targetUser.id = :userId")
    void nullifyTargetUser(@Param("userId") Long userId);
}