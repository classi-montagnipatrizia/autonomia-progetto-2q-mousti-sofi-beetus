package com.example.backend.services;

import com.example.backend.exception.ResourceNotFoundException;
import com.example.backend.models.RefreshToken;
import com.example.backend.models.User;
import com.example.backend.repositories.RefreshTokenRepository;
import com.example.backend.repositories.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

/**
 * Service per la gestione dei refresh token nel database.
 */
@Service
@RequiredArgsConstructor
public class RefreshTokenService {

    private final RefreshTokenRepository refreshTokenRepository;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Value("${jwt.refresh-token-expiration}")
    private Long refreshTokenExpiration;

    /**
     * Crea un nuovo refresh token per l'utente
     * SICUREZZA: Il token viene hashato con BCrypt prima del salvataggio
     * NOTA: Non elimina immediatamente i vecchi token per evitare race conditions
     * durante il refresh automatico. I token scaduti vengono puliti periodicamente.
     */
    @Transactional
    public RefreshToken creaRefreshToken(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Utente", "id", userId));

        // Genera token in chiaro (da restituire al client)
        String plainToken = UUID.randomUUID().toString();

        // Hash del token per storage sicuro
        String hashedToken = passwordEncoder.encode(plainToken);

        // Crea nuovo refresh token con hash
        RefreshToken refreshToken = RefreshToken.builder()
                .user(user)
                .token(hashedToken)
                .expiresAt(LocalDateTime.now().plusSeconds(refreshTokenExpiration / 1000))
                .build();

        RefreshToken saved = refreshTokenRepository.save(refreshToken);

        // Elimina vecchi token dell'utente DOPO aver creato il nuovo
        // Questo evita race conditions durante il refresh automatico
        refreshTokenRepository.deleteByUserIdAndIdNot(userId, saved.getId());

        // Crea una copia del token salvato per restituirlo al client
        // con il token in chiaro invece dell'hash
         return RefreshToken.builder()
                .id(saved.getId())
                .user(saved.getUser())
                .token(plainToken)  // Token in chiaro per il client
                .expiresAt(saved.getExpiresAt())
                .createdAt(saved.getCreatedAt())
                .build();

    }

    /**
     * Elimina i vecchi refresh token di un utente, mantenendo quello corrente
     */
    @Transactional
    public void pulisciVecchiTokenUtente(Long userId, Long keepTokenId) {
        refreshTokenRepository.deleteByUserIdAndIdNot(userId, keepTokenId);
    }

    /**
     * Verifica e restituisce un refresh token se valido
     * SICUREZZA: Confronta il token in chiaro con gli hash nel database
     * PERFORMANCE: Usa query ottimizzata per caricare solo token non scaduti
     */
    public Optional<RefreshToken> verificaRefreshToken(String plainToken) {
        // Recupera solo i token non scaduti e cerca match con BCrypt
        return refreshTokenRepository.findAllValid(LocalDateTime.now()).stream()
                .filter(rt -> {
                    try {
                        // Verifica che il token sia in formato BCrypt prima del match
                        String storedToken = rt.getToken();
                        if (storedToken != null && storedToken.startsWith("$2")) {
                            return passwordEncoder.matches(plainToken, storedToken);
                        }
                        return false;
                    } catch (Exception e) {
                        // Ignora token corrotti senza loggare warning
                        return false;
                    }
                })
                .findFirst();
    }

    /**
     * Elimina un refresh token
     * SICUREZZA: Cerca il token hashato nel database
     * PERFORMANCE: Usa query ottimizzata per caricare solo token non scaduti
     */
    @Transactional
    public void eliminaRefreshToken(String plainToken) {
        // Trova il token che matcha e lo elimina
        refreshTokenRepository.findAllValid(LocalDateTime.now()).stream()
                .filter(rt -> {
                    try {
                        // Verifica che il token sia in formato BCrypt prima del match
                        String storedToken = rt.getToken();
                        if (storedToken != null && storedToken.startsWith("$2")) {
                            return passwordEncoder.matches(plainToken, storedToken);
                        }
                        return false;
                    } catch (Exception e) {
                        // Ignora token corrotti senza loggare warning
                        return false;
                    }
                })
                .findFirst()
                .ifPresent(refreshTokenRepository::delete);
    }

    /**
     * Elimina tutti i refresh token di un utente
     */
    @Transactional
    public void eliminaRefreshTokenUtente(Long userId) {
        refreshTokenRepository.deleteByUserId(userId);
    }

    /**
     * Pulizia periodica dei token scaduti (da chiamare con @Scheduled)
     */
    @Transactional
    public void pulisciTokenScaduti() {
        refreshTokenRepository.deleteExpiredTokens(LocalDateTime.now());
    }
}
