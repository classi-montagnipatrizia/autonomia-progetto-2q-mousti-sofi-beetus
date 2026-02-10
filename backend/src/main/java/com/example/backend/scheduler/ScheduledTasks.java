package com.example.backend.scheduler;

import com.example.backend.repositories.UserSessionRepository;
import com.example.backend.services.AdminService;
import com.example.backend.services.DirectMessageService;
import com.example.backend.services.EmailVerificationService;
import com.example.backend.services.PasswordResetService;
import com.example.backend.services.RefreshTokenService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;

/**
 * Componente centralizzato per tutti i task schedulati dell'applicazione.
 * <p>
 * Gestisce operazioni di manutenzione periodica:
 * - Pulizia messaggi eliminati e vecchi
 * - Rimozione token scaduti
 *
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class ScheduledTasks {

    private final DirectMessageService messageService;
    private final RefreshTokenService refreshTokenService;
    private final AdminService adminService;
    private final PasswordResetService passwordResetService;
    private final UserSessionRepository userSessionRepository;
    private final EmailVerificationService emailVerificationService;

    /**
     * Pulizia notturna dei messaggi eliminati da entrambi gli utenti.
     * Eseguito ogni notte alle 2:00.
     */
    @Scheduled(cron = "0 0 2 * * *")
    public void puliziaNotturnaMessaggi() {
        log.info("Avvio pulizia notturna messaggi eliminati");
        try {
          messageService.pulisciMessaggiEliminatiPermanentemente();

        } catch (Exception e) {
            log.error("Errore durante pulizia notturna messaggi", e);
        }
    }
//
    @Scheduled(cron = "0 0 3 * * *") // Ogni notte alle 3
    public void puliziaNotturna() {
        adminService.puliziaDatabase(1L, 90, null);
    }

    /**
     * Pulizia mensile dei messaggi vecchi di oltre un anno.
     * Eseguito il primo giorno di ogni mese alle 3:00.
     */
    @Scheduled(cron = "0 0 3 1 * *")
    public void puliziaMessaggiVecchi() {
        log.info("Avvio pulizia messaggi vecchi (>365 giorni)");
        try {
            int deleted = messageService.pulisciMessaggiVecchi(365);
            log.info("Pulizia completata: {} messaggi vecchi rimossi", deleted);
        } catch (Exception e) {
            log.error("Errore durante pulizia messaggi vecchi", e);
        }
    }

    /**
     * Pulizia giornaliera dei refresh token scaduti.
     * Eseguito ogni giorno alle 4:00.
     */
    @Scheduled(cron = "0 0 4 * * *")
    public void puliziaTokenScaduti() {
        log.info("Avvio pulizia refresh token scaduti");
        try {
            refreshTokenService.pulisciTokenScaduti();
            log.info("Pulizia token completata");
        } catch (Exception e) {
            log.error("Errore durante pulizia token scaduti", e);
        }
    }

    /**
     * Pulizia giornaliera dei token di reset password scaduti o usati.
     * Eseguito ogni giorno alle 4:30.
     */
    @Scheduled(cron = "0 30 4 * * *")
    public void puliziaPasswordResetTokenScaduti() {
        log.info("Avvio pulizia token reset password scaduti/usati");
        try {
            passwordResetService.cleanupExpiredTokens();
            log.info("Pulizia token reset password completata");
        } catch (Exception e) {
            log.error("Errore durante pulizia token reset password", e);
        }
    }

    /**
     * Pulizia giornaliera delle sessioni WebSocket inattive.
     * Eseguito ogni giorno alle 5:00.
     * <p>
     * Elimina le sessioni con lastActivity più vecchio di 7 giorni.
     * Questo evita che il database si riempia di sessioni vecchie.
     */
    @Scheduled(cron = "0 0 5 * * *")
    public void puliziaSessioniInattive() {
        log.info("Avvio pulizia sessioni WebSocket inattive");
        try {
            LocalDateTime threshold = LocalDateTime.now().minusDays(7);
            userSessionRepository.deleteInactiveSessions(threshold);
            log.info("Pulizia sessioni inattive completata");
        } catch (Exception e) {
            log.error("Errore durante pulizia sessioni inattive", e);
        }
    }

    /**
     * Esegue la pulizia dei token di verifica email scaduti e vecchi.
     * Cron: ogni giorno alle 01:00 AM
     */
    @Scheduled(cron = "0 0 1 * * ?")
    public void puliziaTokenVerificaEmail() {
        log.info("Avvio pulizia automatica token di verifica email");

        try {
            // Elimina token scaduti non verificati
            int expiredDeleted = emailVerificationService.cleanupExpiredTokens();
            log.info("Eliminati {} token scaduti", expiredDeleted);

            // Elimina token verificati vecchi (oltre 30 giorni)
            int oldVerifiedDeleted = emailVerificationService.cleanupOldVerifiedTokens(30);
            log.info("Eliminati {} token verificati obsoleti", oldVerifiedDeleted);

            log.info("Pulizia token verifica email completata con successo");
        } catch (Exception e) {
            log.error("Errore durante la pulizia dei token di verifica email", e);
        }
    }
}
