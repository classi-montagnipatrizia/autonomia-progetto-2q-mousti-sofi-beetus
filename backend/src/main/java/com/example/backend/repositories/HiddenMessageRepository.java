package com.example.backend.repositories;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.example.backend.models.HiddenMessage;

import java.util.Optional;

@Repository
public interface HiddenMessageRepository extends JpaRepository<HiddenMessage, Long> {

    // Verifica se un messaggio è nascosto per un utente
    boolean existsByMessageIdAndUserId(Long messageId, Long userId);

    // Trova record specifico
    Optional<HiddenMessage> findByMessageIdAndUserId(Long messageId, Long userId);

    // Rimuovi nascondimento (rendi di nuovo visibile)
    void deleteByMessageIdAndUserId(Long messageId, Long userId);

    // Conta quanti utenti hanno nascosto un messaggio
    long countByMessageId(Long messageId);

    /**
     * Elimina tutti i record di messaggi nascosti per un utente.
     * Necessario per eliminazione account.
     */
    @Modifying
    @Query("DELETE FROM HiddenMessage hm WHERE hm.user.id = :userId")
    void deleteByUserId(@Param("userId") Long userId);

    /**
     * Elimina tutti i record di messaggi nascosti relativi ai messaggi di un utente.
     * Necessario prima di eliminare i direct_messages dell'utente.
     */
    @Modifying
    @Query("DELETE FROM HiddenMessage hm WHERE hm.message.id IN (SELECT dm.id FROM DirectMessage dm WHERE dm.sender.id = :userId OR dm.receiver.id = :userId)")
    void deleteByMessageUserId(@Param("userId") Long userId);
}
