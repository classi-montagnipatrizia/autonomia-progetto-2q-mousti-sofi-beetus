package com.example.backend.services;

import com.example.backend.events.WelcomeEmailEvent;
import com.example.backend.exception.InvalidTokenException;
import com.example.backend.exception.ResourceNotFoundException;
import com.example.backend.models.EmailVerificationToken;
import com.example.backend.models.User;
import com.example.backend.repositories.EmailVerificationTokenRepository;
import com.example.backend.repositories.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

/**
 * Service per la gestione dei token di verifica email
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class EmailVerificationService {

    private final EmailVerificationTokenRepository tokenRepository;
    private final UserRepository userRepository;
    private final EmailService emailService;
    private final ApplicationEventPublisher eventPublisher;

    private static final int MAX_RESEND_ATTEMPTS_PER_HOUR = 3;

    /**
     * Crea un nuovo token di verifica e invia l'email
     */
    @Transactional
    public EmailVerificationToken createVerificationToken(User user) {
        log.info("Creazione token di verifica per utente: {}", user.getUsername());

        // Crea il token
        EmailVerificationToken token = EmailVerificationToken.createToken(user);
        token = tokenRepository.save(token);

        // Invia email di verifica
        emailService.sendVerificationEmail(user.getEmail(), user.getUsername(), token.getToken());

        log.info("Token di verifica creato e email inviata per utente: {}", user.getUsername());
        return token;
    }

    /**
     * Verifica il token e attiva l'account utente
     */
    @Transactional
    public void verifyEmail(String tokenString) {
        log.info("Verifica token email: {}", tokenString);

        // Trova il token
        EmailVerificationToken token = tokenRepository.findByToken(tokenString)
                .orElseThrow(() -> {
                    log.warn("Token di verifica non trovato: {}", tokenString);
                    return new InvalidTokenException("Token di verifica non valido");
                });

        // Verifica che il token sia valido (non scaduto e non già usato)
        if (!token.isValid()) {
            if (token.getVerified().booleanValue()) {
                log.warn("Token già utilizzato: {}", tokenString);
                throw new InvalidTokenException("Questo link di verifica è già stato utilizzato");
            }
            if (token.isExpired()) {
                log.warn("Token scaduto: {}", tokenString);
                throw new InvalidTokenException("Questo link di verifica è scaduto. Richiedi un nuovo link.");
            }
            throw new InvalidTokenException("Token di verifica non valido");
        }

        // Attiva l'utente
        User user = token.getUser();
        user.setIsActive(true);
        userRepository.save(user);

        // Segna il token come verificato
        token.setVerified(true);
        tokenRepository.save(token);

        log.info("Email verificata con successo per utente: {} (ID: {})", user.getUsername(), user.getId());

        // Pubblica evento per inviare email di benvenuto
        eventPublisher.publishEvent(new WelcomeEmailEvent(user.getEmail(), user.getUsername()));
        log.debug("Evento WelcomeEmailEvent pubblicato per utente: {}", user.getUsername());
    }

    /**
     * Re-invia email di verifica
     */
    @Transactional
    public void resendVerificationEmail(String email) {
        log.info("Richiesta re-invio email di verifica per: {}", email);

        // Trova l'utente
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> {
                    log.warn("Utente non trovato con email: {}", email);
                    return new ResourceNotFoundException("Utente", "email", email);
                });

        // Verifica che l'utente non sia già attivo
        if (user.getIsActive().booleanValue()) {
            log.warn("Tentativo di re-invio per utente già attivo: {}", email);
            throw new IllegalStateException("Questo account è già verificato");
        }

        // Verifica rate limiting (max 3 richieste nell'ultima ora)
        long recentAttempts = tokenRepository.findByUser(user).stream()
                .filter(t -> t.getCreatedAt().isAfter(LocalDateTime.now().minusHours(1)))
                .count();

        if (recentAttempts >= MAX_RESEND_ATTEMPTS_PER_HOUR) {
            log.warn("Troppi tentativi di re-invio per: {}", email);
            throw new IllegalStateException("Hai richiesto troppe email di verifica. Riprova più tardi.");
        }

        // Crea nuovo token (duplicato per evitare warning transactional)
        EmailVerificationToken token = EmailVerificationToken.createToken(user);
        tokenRepository.save(token);
        
        // Invia email di verifica
        emailService.sendVerificationEmail(user.getEmail(), user.getUsername(), token.getToken());
        
        log.info("Email di verifica re-inviata per utente: {}", user.getUsername());
    }

    /**
     * Pulisce i token scaduti (chiamato da scheduled job)
     */
    @Transactional
    public int cleanupExpiredTokens() {
        log.info("Pulizia token di verifica scaduti");
        int deleted = tokenRepository.deleteExpiredTokens(LocalDateTime.now());
        log.info("Eliminati {} token scaduti", deleted);
        return deleted;
    }

    /**
     * Pulisce i token verificati vecchi (chiamato da scheduled job)
     */
    @Transactional
    public int cleanupOldVerifiedTokens(int daysOld) {
        log.info("Pulizia token verificati più vecchi di {} giorni", daysOld);
        LocalDateTime cutoffDate = LocalDateTime.now().minusDays(daysOld);
        int deleted = tokenRepository.deleteOldVerifiedTokens(cutoffDate);
        log.info("Eliminati {} token verificati vecchi", deleted);
        return deleted;
    }
}
