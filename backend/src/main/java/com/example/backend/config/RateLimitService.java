package com.example.backend.config;

import com.github.benmanes.caffeine.cache.Cache;
import com.github.benmanes.caffeine.cache.Caffeine;
import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.Bucket;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Servizio per gestire il rate limiting usando Bucket4j.
 * <p>
 * Utilizza Token Bucket Algorithm:
 * - Ogni utente ha un "bucket" di token
 * - Ogni richiesta consuma 1 token
 * - I token vengono riempiti a velocità fissa
 * - Se non ci sono token, la richiesta viene rifiutata
 * <p>
 * Vantaggi:
 * - Permette burst di richieste fino al limite del bucket
 * - Riempimento costante dei token
 * - Configurabile per tipo di operazione
 */
@Service
@Slf4j
public class RateLimitService {

    // Cache in-memory per i bucket, con scadenza automatica
    // Usa Caffeine per performance ottimali e gestione memoria
    private final Cache<String, Bucket> cache;

    // Configurazione dei limiti per ogni tipo
    private final Map<RateLimitType, BucketConfiguration> configurations;

    public RateLimitService() {
        // Configurazione cache: scadenza dopo 10 minuti di inattività
        // Questo previene memory leak per utenti che non fanno più richieste
        this.cache = Caffeine.newBuilder()
                .maximumSize(10_000) // Max 10k utenti in cache
                .expireAfterAccess(Duration.ofMinutes(10))
                .recordStats() // Abilita statistiche per monitoring
                .build();

        // Configurazione limiti per tipo
        this.configurations = new ConcurrentHashMap<>();
        initializeConfigurations();
    }

    /**
     * Inizializza le configurazioni di rate limiting per ogni tipo.
     * <p>
     * Configurazioni:
     * - AUTH: 5 req/min (brute force protection)
     * - POST_CREATION: 10 req/min (spam prevention)
     * - LIKE: 30 req/min (abuse prevention)
     * - MESSAGE: 20 req/min (spam prevention)
     * - API_GENERAL: 100 req/min (general protection)
     * - WEBSOCKET: 50 msg/min (DoS prevention)
     */
    private void initializeConfigurations() {
        // AUTH: molto restrittivo per prevenire brute force
        configurations.put(RateLimitType.AUTH,
                new BucketConfiguration(5, Duration.ofMinutes(1)));

        // POST_CREATION: limita spam di contenuti
        configurations.put(RateLimitType.POST_CREATION,
                new BucketConfiguration(10, Duration.ofMinutes(1)));

        // LIKE: permette più azioni ma previene abuse
        configurations.put(RateLimitType.LIKE,
                new BucketConfiguration(30, Duration.ofMinutes(1)));

        // MESSAGE: previene spam di messaggi
        configurations.put(RateLimitType.MESSAGE,
                new BucketConfiguration(20, Duration.ofMinutes(1)));

        // API_GENERAL: limite generale per tutte le API
        configurations.put(RateLimitType.API_GENERAL,
                new BucketConfiguration(100, Duration.ofMinutes(1)));

        // WEBSOCKET: previene DoS su connessioni real-time
        configurations.put(RateLimitType.WEBSOCKET,
                new BucketConfiguration(50, Duration.ofMinutes(1)));
    }

    /**
     * Verifica se una richiesta può essere processata.
     *
     * @param key  Chiave univoca (es: "user:123" o "ip:192.168.1.1")
     * @param type Tipo di rate limit da applicare
     * @return true se la richiesta può procedere, false se il limite è stato superato
     */
    public boolean tryConsume(String key, RateLimitType type) {
        Bucket bucket = resolveBucket(key, type);
        boolean consumed = bucket.tryConsume(1);

        if (!consumed) {
            log.warn("Rate limit exceeded - Key: {}, Type: {}", key, type);
        }

        return consumed;
    }

    /**
     * Ottiene informazioni sullo stato corrente del bucket.
     *
     * @param key  Chiave univoca
     * @param type Tipo di rate limit
     * @return Numero di token disponibili
     */
    public long getAvailableTokens(String key, RateLimitType type) {
        Bucket bucket = resolveBucket(key, type);
        return bucket.getAvailableTokens();
    }

    /**
     * Risolve o crea un bucket per la chiave specificata.
     *
     * @param key  Chiave univoca
     * @param type Tipo di rate limit
     * @return Bucket configurato
     */
    private Bucket resolveBucket(String key, RateLimitType type) {
        String cacheKey = key + ":" + type.name();

        return cache.get(cacheKey, k -> {
            BucketConfiguration config = configurations.get(type);
            return createBucket(config);
        });
    }

    /**
     * Crea un nuovo bucket con la configurazione specificata.
     *
     * @param config Configurazione del bucket
     * @return Bucket configurato
     */
    private Bucket createBucket(BucketConfiguration config) {
        // Bandwidth definisce la capacità del bucket e il refill
        Bandwidth limit = Bandwidth.builder()
                .capacity(config.capacity)
                .refillIntervally(config.capacity, config.refillDuration)
                .build();

        return Bucket.builder()
                .addLimit(limit)
                .build();
    }

    /**
     * Resetta il bucket per una chiave specifica.
     * Utile per testing o operazioni admin.
     *
     * @param key  Chiave univoca
     * @param type Tipo di rate limit
     */
    public void resetBucket(String key, RateLimitType type) {
        String cacheKey = key + ":" + type.name();
        cache.invalidate(cacheKey);
        log.info("Bucket reset - Key: {}, Type: {}", key, type);
    }

    /**
     * Ottiene statistiche della cache (per monitoring).
     *
     * @return Statistiche della cache
     */
    public String getCacheStats() {
        return cache.stats().toString();
    }

    /**
     * Classe di configurazione per un bucket.
     */
    private static class BucketConfiguration {
        final long capacity;
        final Duration refillDuration;

        BucketConfiguration(long capacity, Duration refillDuration) {
            this.capacity = capacity;
            this.refillDuration = refillDuration;
        }
    }
}
