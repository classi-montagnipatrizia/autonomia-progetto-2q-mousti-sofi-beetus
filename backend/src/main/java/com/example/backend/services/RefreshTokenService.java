package com.example.backend.services;

import com.example.backend.exception.ResourceNotFoundException;
import com.example.backend.models.RefreshToken;
import com.example.backend.models.User;
import com.example.backend.repositories.RefreshTokenRepository;
import com.example.backend.repositories.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.Base64;
import java.util.Optional;

/**
 * Service per la gestione dei refresh token nel database.
 *
 * Storage: SHA-256 hex del token in chiaro (deterministico) con UNIQUE INDEX
 * → lookup O(1), niente loop BCrypt su tutti i token attivi.
 * Il token in chiaro è 256 bit random (base64url), abbastanza entropia da
 * rendere il brute-force impossibile anche senza hash lento.
 */
@Service
@RequiredArgsConstructor
public class RefreshTokenService {

    private static final SecureRandom SECURE_RANDOM = new SecureRandom();
    private static final int TOKEN_BYTES = 32; // 256 bit

    private final RefreshTokenRepository refreshTokenRepository;
    private final UserRepository userRepository;

    @Value("${jwt.refresh-token-expiration}")
    private Long refreshTokenExpiration;

    /**
     * Crea un nuovo refresh token per l'utente e restituisce il valore in chiaro
     * (l'unico momento in cui esiste). Nel DB viene salvato solo lo SHA-256.
     * NOTA: I vecchi token vengono eliminati DOPO il salvataggio per evitare
     * race condition con refresh paralleli.
     */
    @Transactional
    public String creaRefreshToken(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Utente", "id", userId));

        String plainToken = generatePlainToken();
        String tokenHash = sha256Hex(plainToken);

        RefreshToken refreshToken = RefreshToken.builder()
                .user(user)
                .tokenHash(tokenHash)
                .expiresAt(LocalDateTime.now().plusSeconds(refreshTokenExpiration / 1000))
                .build();

        RefreshToken saved = refreshTokenRepository.save(refreshToken);
        refreshTokenRepository.deleteByUserIdAndIdNot(userId, saved.getId());

        return plainToken;
    }

    /**
     * Verifica e restituisce il refresh token se valido (non scaduto).
     * Lookup O(1) tramite UNIQUE INDEX su token_hash.
     */
    public Optional<RefreshToken> verificaRefreshToken(String plainToken) {
        if (plainToken == null || plainToken.isEmpty()) {
            return Optional.empty();
        }
        return refreshTokenRepository.findByTokenHashAndExpiresAtAfter(
                sha256Hex(plainToken), LocalDateTime.now()
        );
    }

    /**
     * Elimina un refresh token specifico (logout su un singolo device).
     */
    @Transactional
    public void eliminaRefreshToken(String plainToken) {
        if (plainToken == null || plainToken.isEmpty()) {
            return;
        }
        refreshTokenRepository
                .findByTokenHashAndExpiresAtAfter(sha256Hex(plainToken), LocalDateTime.now())
                .ifPresent(refreshTokenRepository::delete);
    }

    /**
     * Elimina tutti i refresh token di un utente (logout globale).
     */
    @Transactional
    public void eliminaRefreshTokenUtente(Long userId) {
        refreshTokenRepository.deleteByUserId(userId);
    }

    /**
     * Pulizia periodica dei token scaduti (chiamata da ScheduledTasks).
     */
    @Transactional
    public void pulisciTokenScaduti() {
        refreshTokenRepository.deleteExpiredTokens(LocalDateTime.now());
    }

    private static String generatePlainToken() {
        byte[] bytes = new byte[TOKEN_BYTES];
        SECURE_RANDOM.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    private static String sha256Hex(String input) {
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            byte[] digest = md.digest(input.getBytes(StandardCharsets.UTF_8));
            StringBuilder hex = new StringBuilder(digest.length * 2);
            for (byte b : digest) {
                hex.append(String.format("%02x", b));
            }
            return hex.toString();
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 non disponibile nella JVM", e);
        }
    }
}
