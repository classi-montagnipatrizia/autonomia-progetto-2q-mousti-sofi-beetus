package com.example.backend.services;

import com.example.backend.events.PasswordChangedEmailEvent;
import com.example.backend.events.PasswordResetEmailEvent;
import com.example.backend.exception.InvalidInputException;
import com.example.backend.exception.ResourceNotFoundException;
import com.example.backend.models.PasswordResetToken;
import com.example.backend.models.User;
import com.example.backend.repositories.PasswordResetTokenRepository;
import com.example.backend.repositories.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Service per la gestione del reset della password.
 * <p>
 * Gestisce il flusso completo di reset password:
 * 1. Utente richiede reset fornendo email
 * 2. Sistema genera token univoco e invia email
 * 3. Utente clicca link nell'email
 * 4. Utente fornisce nuova password con token
 * 5. Sistema valida token e aggiorna password
 * <p>
 * I token hanno validità di 1 ora e sono monouso.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class PasswordResetService {

    private final UserRepository userRepository;
    private final PasswordResetTokenRepository tokenRepository;
    private final ApplicationEventPublisher eventPublisher;
    private final PasswordEncoder passwordEncoder;

    // Validità token: 1 ora
    private static final long TOKEN_EXPIRATION_HOURS = 1;

    /**
     * Richiede il reset della password.
     * <p>
     * Genera un token univoco, lo salva nel database e invia
     * email all'utente con il link di reset.
     * <p>
     * Per sicurezza, anche se l'email non esiste nel sistema,
     * restituisce sempre un messaggio di successo (per evitare
     * user enumeration attacks).
     *
     * @param email L'email dell'utente che richiede il reset
     */
    @Transactional
    public void requestPasswordReset(String email) {
        log.info("Richiesta reset password per email: {}", email);

        // Cerca l'utente per email (solo se attivo)
        User user = userRepository.findByEmailAndIsActiveTrue(email).orElse(null);

        // Se l'utente non esiste, logga ma non dare errore
       
        if (user == null) {
            log.warn("Tentativo reset password per email non registrata: {}", email);
            // Ritorna comunque senza errore per sicurezza
            return;
        }

        // Verifica che l'account sia attivo
        if (!user.getIsActive().booleanValue()) {
            log.warn("Tentativo reset password per account disattivato: {}", email);
            return;
        }

        // Invalida eventuali token precedenti dell'utente
        tokenRepository.invalidateUserTokens(user.getId());

        // Genera nuovo token univoco
        String token = generateSecureToken();

        // Calcola scadenza (1 ora da ora)
        LocalDateTime expiresAt = LocalDateTime.now().plusHours(TOKEN_EXPIRATION_HOURS);

        // Crea e salva il token
        PasswordResetToken resetToken = PasswordResetToken.builder()
                .user(user)
                .token(token)
                .expiresAt(expiresAt)
                .isUsed(false)
                .createdAt(LocalDateTime.now())
                .build();

        tokenRepository.save(resetToken);

        // Pubblica evento per invio email con token
        eventPublisher.publishEvent(new PasswordResetEmailEvent(
                user.getEmail(),
                user.getUsername(),
                token
        ));
        log.debug("Evento PasswordResetEmailEvent pubblicato per utente: {}", user.getUsername());

        log.info("Token reset password generato per utente: {} (ID: {})", user.getUsername(), user.getId());
    }

    /**
     * Conferma il reset della password e imposta la nuova password.
     * <p>
     * Valida il token ricevuto e, se valido:
     * - Aggiorna la password dell'utente
     * - Marca il token come utilizzato
     * - Invia email di conferma
     *
     * @param token       Il token ricevuto via email
     * @param newPassword La nuova password da impostare
     * @throws InvalidInputException     Se il token è invalido, scaduto o già usato
     * @throws ResourceNotFoundException Se il token non esiste
     */
    @Transactional
    public void confirmPasswordReset(String token, String newPassword) {
        log.info("Conferma reset password con token");

        // Validazione password
        if (newPassword == null || newPassword.length() < 6) {
            throw new InvalidInputException("La password deve essere di almeno 6 caratteri");
        }

        // Trova token valido (non usato e non scaduto)
        PasswordResetToken resetToken = tokenRepository
                .findValidToken(token, LocalDateTime.now())
                .orElseThrow(() -> {
                    log.warn("Tentativo utilizzo token invalido o scaduto");
                    return new InvalidInputException(
                            "Token non valido o scaduto. Richiedi un nuovo reset password.");
                });

        User user = resetToken.getUser();

        // Verifica che l'account sia ancora attivo
        if (!user.getIsActive().booleanValue()) {
            log.warn("Tentativo reset password per account disattivato: {}", user.getEmail());
            throw new InvalidInputException("Account non attivo");
        }

        // Aggiorna la password
        user.setPasswordHash(passwordEncoder.encode(newPassword));
        userRepository.save(user);

        // Marca il token come utilizzato
        resetToken.setIsUsed(true);
        tokenRepository.save(resetToken);

        // Pubblica evento per invio email di conferma
        eventPublisher.publishEvent(new PasswordChangedEmailEvent(user.getEmail(), user.getUsername()));
        log.debug("Evento PasswordChangedEmailEvent pubblicato per utente: {}", user.getUsername());

        log.info("Password resettata con successo per utente: {} (ID: {})",
                user.getUsername(), user.getId());
    }

    /**
     * Verifica se un token è valido.
     * <p>
     * Utile per il frontend per verificare se il token nell'URL
     * è ancora valido prima di mostrare il form di reset.
     *
     * @param token Il token da verificare
     * @return true se il token è valido, false altrimenti
     */
    @Transactional(readOnly = true)
    public boolean isTokenValid(String token) {
        return tokenRepository.findValidToken(token, LocalDateTime.now()).isPresent();
    }

    /**
     * Pulisce i token scaduti o già utilizzati dal database.
     * <p>
     * Questo metodo viene chiamato da uno scheduled job
     * per mantenere il database pulito.
     */
    @Transactional
    public void cleanupExpiredTokens() {
        log.info("Pulizia token reset password scaduti/usati");

        tokenRepository.deleteExpiredOrUsedTokens(LocalDateTime.now());

        log.info("Pulizia token completata");
    }

    /**
     * Genera un token sicuro e univoco.
     * <p>
     * Utilizza UUID random per garantire unicità e sicurezza.
     * Rimuove i trattini per maggiore leggibilità nell'URL.
     *
     * @return Token sicuro di 32 caratteri
     */
    private String generateSecureToken() {
        return UUID.randomUUID().toString().replace("-", "");
    }
}
