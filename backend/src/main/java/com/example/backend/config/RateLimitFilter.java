package com.example.backend.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.lang.NonNull;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.HashMap;
import java.util.Map;

/**
 * Filtro per applicare rate limiting alle richieste HTTP.
 * <p>
 * Questo filtro intercetta tutte le richieste HTTP e applica rate limiting
 * basato su:
 * - Username (per utenti autenticati)
 * - IP address (per utenti non autenticati)
 * - Endpoint specifico (diversi limiti per diverse operazioni)
 * <p>
 * Se il limite viene superato, restituisce 429 Too Many Requests.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class RateLimitFilter extends OncePerRequestFilter {

    private final RateLimitService rateLimitService;

    // Mappa degli endpoint e i loro limiti specifici
    private static final Map<String, RateLimitType> ENDPOINT_LIMITS = new HashMap<>();

    static {
        // Autenticazione - molto restrittivo
        ENDPOINT_LIMITS.put("/api/auth/login", RateLimitType.AUTH);
        ENDPOINT_LIMITS.put("/api/auth/register", RateLimitType.AUTH);
        ENDPOINT_LIMITS.put("/api/auth/forgot-password", RateLimitType.AUTH);

        // Creazione contenuti - prevenzione spam
        ENDPOINT_LIMITS.put("/api/posts", RateLimitType.POST_CREATION);
        ENDPOINT_LIMITS.put("/api/comments", RateLimitType.POST_CREATION);

        // Like - prevenzione abuse
        ENDPOINT_LIMITS.put("/api/likes", RateLimitType.LIKE);

        // Messaggi - prevenzione spam
        ENDPOINT_LIMITS.put("/api/messages", RateLimitType.MESSAGE);
    }

    @Override
    protected void doFilterInternal(@NonNull HttpServletRequest request,
                                  @NonNull   HttpServletResponse response,
                                   @NonNull  FilterChain filterChain) throws ServletException, IOException {

        String path = request.getRequestURI();
        String method = request.getMethod();

        // Determina il tipo di rate limit da applicare
        RateLimitType limitType = determineRateLimitType(path, method);

        // Genera chiave univoca per il rate limiting
        String key = generateKey(request);

        // Verifica il rate limit
        if (!rateLimitService.tryConsume(key, limitType)) {
            // Rate limit superato - restituisci 429
            handleRateLimitExceeded(response, key, limitType);
            return;
        }

        // Aggiungi header informativi sulla richiesta
        long availableTokens = rateLimitService.getAvailableTokens(key, limitType);
        response.setHeader("X-RateLimit-Remaining", String.valueOf(availableTokens));
        response.setHeader("X-RateLimit-Limit", getLimitForType(limitType));

        // Procedi con la richiesta
        filterChain.doFilter(request, response);
    }

    /**
     * Determina il tipo di rate limit da applicare in base all'endpoint.
     *
     * @param path   Path della richiesta
     * @param method Metodo HTTP
     * @return Tipo di rate limit da applicare
     */
    private RateLimitType determineRateLimitType(String path, String method) {
        // Controlla se c'è un limite specifico per questo endpoint
        for (Map.Entry<String, RateLimitType> entry : ENDPOINT_LIMITS.entrySet()) {
            if (path.startsWith(entry.getKey())) {
                // Solo POST/PUT/DELETE per creazione contenuti
                if (entry.getValue() == RateLimitType.POST_CREATION) {
                    if (method.equals("POST") || method.equals("PUT") || method.equals("DELETE")) {
                        return entry.getValue();
                    }
                } else {
                    return entry.getValue();
                }
            }
        }

        // Default: limite generale API
        return RateLimitType.API_GENERAL;
    }

    /**
     * Genera chiave univoca per il rate limiting.
     * <p>
     * Per utenti autenticati: user:{username}
     * Per utenti non autenticati: ip:{ip_address}:session:{session_id}
     * <p>
     * L'uso della session ID per utenti non autenticati permette di distinguere
     * più utenti dietro lo stesso IP (es. stessa rete domestica/aziendale con NAT),
     * riducendo i falsi positivi mantenendo comunque protezione contro brute-force.
     *
     * @param request Richiesta HTTP
     * @return Chiave univoca
     */
    private String generateKey(HttpServletRequest request) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();

        if (authentication != null && authentication.isAuthenticated()
                && !authentication.getPrincipal().equals("anonymousUser")) {
            // Utente autenticato - usa username
            return "user:" + authentication.getName();
        } else {
            // Utente non autenticato - usa IP + Session ID per maggiore granularità
            // Questo permette a più utenti dietro lo stesso NAT di avere rate limit separati
            String sessionId = request.getSession(true).getId();
            return "ip:" + getClientIP(request) + ":session:" + sessionId;
        }
    }

    /**
     * Ottiene l'IP del client gestendo correttamente proxy/load balancer.
     *
     * @param request Richiesta HTTP
     * @return IP del client
     */
    private String getClientIP(HttpServletRequest request) {
        String xForwardedFor = request.getHeader("X-Forwarded-For");
        if (xForwardedFor != null && !xForwardedFor.isEmpty()) {
            // Se dietro proxy, prendi il primo IP
            return xForwardedFor.split(",")[0].trim();
        }

        String xRealIP = request.getHeader("X-Real-IP");
        if (xRealIP != null && !xRealIP.isEmpty()) {
            return xRealIP;
        }

        return request.getRemoteAddr();
    }

    /**
     * Gestisce il caso in cui il rate limit è stato superato.
     *
     * @param response  Risposta HTTP
     * @param key       Chiave che ha superato il limite
     * @param limitType Tipo di limite superato
     */
    private void handleRateLimitExceeded(HttpServletResponse response,
                                          String key,
                                          RateLimitType limitType) throws IOException {
        log.warn("Rate limit exceeded - Key: {}, Type: {}", key, limitType);

        response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
        response.setContentType("application/json");
        response.setHeader("X-RateLimit-Retry-After", "60"); // Retry dopo 60 secondi

        String jsonResponse = String.format(
                "{\"error\":\"Rate limit exceeded\",\"message\":\"Troppe richieste. Riprova tra qualche istante.\",\"type\":\"%s\"}",
                limitType.name()
        );

        response.getWriter().write(jsonResponse);
    }

    /**
     * Ottiene il limite per un tipo specifico (per header informativi).
     *
     * @param type Tipo di rate limit
     * @return Stringa con il limite
     */
    private String getLimitForType(RateLimitType type) {
        return switch (type) {
            case AUTH -> "5/min";
            case POST_CREATION -> "10/min";
            case LIKE -> "30/min";
            case MESSAGE -> "20/min";
            case API_GENERAL -> "100/min";
            case WEBSOCKET -> "50/min";
        };
    }

    @Override
    protected boolean shouldNotFilter(@NonNull HttpServletRequest request) {
        String path = request.getRequestURI();

        // Non applicare rate limiting a:
        // - Risorse statiche
        // - Endpoint di health check
        // - WebSocket handshake (gestito separatamente)
        return path.startsWith("/actuator") ||
                path.startsWith("/ws") ||
                path.startsWith("/static") ||
                path.endsWith(".css") ||
                path.endsWith(".js") ||
                path.endsWith(".png") ||
                path.endsWith(".jpg");
    }
}
