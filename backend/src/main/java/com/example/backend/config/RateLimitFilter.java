package com.example.backend.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;
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

    private static final String GET_METHOD = "GET";
    private static final String POST_METHOD = "POST";
    private static final String PUT_METHOD = "PUT";
    private static final String DELETE_METHOD = "DELETE";
    private static final String ANONYMOUS_USER = "anonymousUser";

    private final RateLimitService rateLimitService;

    // Lista ordinata degli endpoint e i loro limiti specifici.
    // L'ordine è importante: i pattern più specifici devono venire prima.
    private static final List<Map.Entry<String, RateLimitType>> ENDPOINT_LIMITS = new java.util.ArrayList<>();

    static {
        // Autenticazione - molto restrittivo
        ENDPOINT_LIMITS.add(Map.entry("/api/auth/login", RateLimitType.AUTH));
        ENDPOINT_LIMITS.add(Map.entry("/api/auth/register", RateLimitType.AUTH));
        ENDPOINT_LIMITS.add(Map.entry("/api/auth/forgot-password", RateLimitType.AUTH));
        ENDPOINT_LIMITS.add(Map.entry("/api/auth/resend-verification", RateLimitType.AUTH));

        // Admin - protezione contro account compromessi
        ENDPOINT_LIMITS.add(Map.entry("/api/admin", RateLimitType.ADMIN));

        // AI - limite chiamate servizi AI (prima di pattern più generici)
        ENDPOINT_LIMITS.add(Map.entry("/api/ai", RateLimitType.AI));

        // Messaggi libro - prevenzione spam (prima di /api/books generico)
        ENDPOINT_LIMITS.add(Map.entry("/api/books/conversations", RateLimitType.MESSAGE));

        // Libri - creazione annunci
        ENDPOINT_LIMITS.add(Map.entry("/api/books", RateLimitType.POST_CREATION));

        // Creazione contenuti - prevenzione spam
        ENDPOINT_LIMITS.add(Map.entry("/api/posts", RateLimitType.POST_CREATION));
        ENDPOINT_LIMITS.add(Map.entry("/api/comments", RateLimitType.POST_CREATION));

        // Like - prevenzione abuse
        ENDPOINT_LIMITS.add(Map.entry("/api/likes", RateLimitType.LIKE));

        // Messaggi - prevenzione spam
        ENDPOINT_LIMITS.add(Map.entry("/api/messages", RateLimitType.MESSAGE));

        // Gruppi - messaggi (pattern con /messages prima del generico /api/groups)
        ENDPOINT_LIMITS.add(Map.entry("/api/groups/", RateLimitType.MESSAGE));

        // Gruppi - creazione gruppi (solo POST /api/groups senza slash finale)
        ENDPOINT_LIMITS.add(Map.entry("/api/groups", RateLimitType.POST_CREATION));

        // Push notifications - subscribe/unsubscribe (operazione infrequente)
        ENDPOINT_LIMITS.add(Map.entry("/api/push", RateLimitType.POST_CREATION));
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain) throws ServletException, IOException {

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
        // La lista è ordinata: pattern più specifici vengono prima.
        for (Map.Entry<String, RateLimitType> entry : ENDPOINT_LIMITS) {
            if (!path.startsWith(entry.getKey())) {
                continue;
            }

            return resolveLimitForMethod(entry.getValue(), method);
        }

        // Default: limite generale API
        return RateLimitType.API_GENERAL;
    }

    private RateLimitType resolveLimitForMethod(RateLimitType limitType, String method) {
        if (limitType == RateLimitType.MESSAGE && GET_METHOD.equals(method)) {
            return RateLimitType.API_GENERAL;
        }

        if (limitType == RateLimitType.POST_CREATION && !isWriteMethod(method)) {
            return RateLimitType.API_GENERAL;
        }

        return limitType;
    }

    private boolean isWriteMethod(String method) {
        return POST_METHOD.equals(method) || PUT_METHOD.equals(method) || DELETE_METHOD.equals(method);
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
        Object principal = authentication != null ? authentication.getPrincipal() : null;

        if (authentication != null && authentication.isAuthenticated()
                && principal != null
                && !ANONYMOUS_USER.equals(principal)) {
            // Utente autenticato - usa username
            return "user:" + authentication.getName();
        } else {
            // Utente non autenticato - usa solo IP.
            // NON creare sessione (getSession(false)): creare una sessione ad ogni request
            // permetterebbe di bypassare il rate limit ottenendo un nuovo sessionId a ogni chiamata.
            String ip = getClientIP(request);
            jakarta.servlet.http.HttpSession existing = request.getSession(false);
            return existing != null
                    ? "ip:" + ip + ":session:" + existing.getId()
                    : "ip:" + ip;
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
            case AI -> "10/min";
            case ADMIN -> "30/min";
            case API_GENERAL -> "100/min";
            case WEBSOCKET -> "50/min";
        };
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
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
