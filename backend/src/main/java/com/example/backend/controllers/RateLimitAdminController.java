package com.example.backend.controllers;

import com.example.backend.config.RateLimitService;
import com.example.backend.config.RateLimitType;
import com.example.backend.exception.ResourceNotFoundException;
import com.example.backend.repositories.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

/**
 * Controller per gestione amministrativa del rate limiting.
 * <p>
 * Fornisce endpoint per:
 * - Visualizzare statistiche del rate limiting
 * - Resettare limiti per utenti specifici
 * - Monitorare lo stato della cache
 * <p>
 * Tutti gli endpoint richiedono privilegi ADMIN.
 */
@RestController
@RequestMapping("/api/admin/rate-limit")
@RequiredArgsConstructor
@Slf4j
@PreAuthorize("hasRole('ADMIN')")
public class RateLimitAdminController {

    private final RateLimitService rateLimitService;
    private final UserRepository userRepository;

    /**
     * Ottiene statistiche generali sul rate limiting.
     * <p>
     * Restituisce informazioni sulla cache e utilizzo memoria.
     *
     * @return Statistiche del rate limiting
     */
    @GetMapping("/stats")
    public ResponseEntity<Map<String, Object>> getStats() {
        log.info("Admin richiede statistiche rate limiting");

        Map<String, Object> stats = new HashMap<>();
        stats.put("cacheStats", rateLimitService.getCacheStats());
        stats.put("rateLimitTypes", RateLimitType.values());
        stats.put("message", "Statistiche del rate limiting cache");

        return ResponseEntity.ok(stats);
    }

    /**
     * Resetta il rate limit per un utente specifico.
     * <p>
     * Utile per sbloccare utenti che hanno superato il limite per errore
     * o per testing.
     *
     * @param username L'username dell'utente
     * @param type     Il tipo di rate limit da resettare
     * @return Conferma dell'operazione
     */
    @DeleteMapping("/reset/user/{username}")
    public ResponseEntity<Map<String, String>> resetUserRateLimit(
            @PathVariable String username,
            @RequestParam RateLimitType type) {

        log.info("Admin resetta rate limit - User: {}, Type: {}", username, type);

        // Verifica che l'utente esista
        userRepository.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("Utente non trovato"));

        String key = "user:" + username;
        rateLimitService.resetBucket(key, type);

        Map<String, String> response = new HashMap<>();
        response.put("message", "Rate limit resettato con successo");
        response.put("username", username);
        response.put("type", type.name());

        return ResponseEntity.ok(response);
    }

    /**
     * Resetta il rate limit per una chiave IP specifica.
     * <p>
     * Utile per sbloccare IP che hanno superato il limite.
     * La chiave deve includere IP e session ID nel formato: ip:192.168.1.1:session:ABC123
     *
     * @param ipSessionKey La chiave completa (formato: ip:{ip}:session:{sessionId})
     * @param type         Il tipo di rate limit da resettare
     * @return Conferma dell'operazione
     */
    @DeleteMapping("/reset/ip/{ipSessionKey}")
    public ResponseEntity<Map<String, String>> resetIpRateLimit(
            @PathVariable String ipSessionKey,
            @RequestParam RateLimitType type) {

        log.info("Admin resetta rate limit - Key: {}, Type: {}", ipSessionKey, type);

        rateLimitService.resetBucket(ipSessionKey, type);

        Map<String, String> response = new HashMap<>();
        response.put("message", "Rate limit resettato con successo");
        response.put("key", ipSessionKey);
        response.put("type", type.name());

        return ResponseEntity.ok(response);
    }

    /**
     * Ottiene i token rimanenti per un utente specifico.
     * <p>
     * Utile per debugging e monitoring.
     *
     * @param username L'username dell'utente
     * @param type     Il tipo di rate limit da verificare
     * @return Numero di token disponibili
     */
    @GetMapping("/tokens/user/{username}")
    public ResponseEntity<Map<String, Object>> getUserTokens(
            @PathVariable String username,
            @RequestParam RateLimitType type) {

        // Verifica che l'utente esista
        userRepository.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("Utente non trovato"));

        String key = "user:" + username;
        long tokens = rateLimitService.getAvailableTokens(key, type);

        Map<String, Object> response = new HashMap<>();
        response.put("username", username);
        response.put("type", type.name());
        response.put("availableTokens", tokens);
        response.put("limit", getLimitDescription(type));

        return ResponseEntity.ok(response);
    }

    /**
     * Helper per ottenere descrizione del limite.
     *
     * @param type Tipo di rate limit
     * @return Descrizione del limite
     */
    private String getLimitDescription(RateLimitType type) {
        return switch (type) {
            case AUTH -> "5 richieste/minuto";
            case POST_CREATION -> "10 richieste/minuto";
            case LIKE -> "30 richieste/minuto";
            case MESSAGE -> "20 richieste/minuto";
            case API_GENERAL -> "100 richieste/minuto";
            case WEBSOCKET -> "50 messaggi/minuto";
        };
    }
}
