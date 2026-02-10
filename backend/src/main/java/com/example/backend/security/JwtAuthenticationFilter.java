package com.example.backend.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.lang.NonNull;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

/**
 * Filtro che intercetta ogni richiesta HTTP per validare il token JWT.
 * Se il token è valido, imposta l'autenticazione nel SecurityContext.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtTokenProvider jwtTokenProvider;
    private final CustomUserDetailsService userDetailsService;

    @Override
    protected void doFilterInternal(
            @NonNull HttpServletRequest request,
            @NonNull HttpServletResponse response,
            @NonNull FilterChain filterChain
    ) throws ServletException, IOException {

        // Estrae l'header Authorization
        final String authHeader = request.getHeader("Authorization");
        final String jwt;
        final String username;

        // Se non c'è header o non inizia con "Bearer ", passa al prossimo filtro
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            filterChain.doFilter(request, response);
            return;
        }

        try {
            // Estrae il token (rimuove "Bearer ")
            jwt = authHeader.substring(7);

            // Estrae l'username dal token
            username = jwtTokenProvider.extractUsername(jwt);

            // Se l'username esiste e l'utente non è già autenticato
            if (username != null && SecurityContextHolder.getContext().getAuthentication() == null) {

                // Carica i dettagli dell'utente dal database
                UserDetails userDetails = userDetailsService.loadUserByUsername(username);

                // Valida il token
                if (jwtTokenProvider.validateToken(jwt, userDetails)) {

                    // Crea il token di autenticazione
                    UsernamePasswordAuthenticationToken authToken = new UsernamePasswordAuthenticationToken(
                            userDetails,
                            null,
                            userDetails.getAuthorities()
                    );

                    // Aggiunge dettagli della richiesta
                    authToken.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));

                    // Imposta l'autenticazione nel SecurityContext
                    SecurityContextHolder.getContext().setAuthentication(authToken);

                    log.debug("Utente {} autenticato con successo per {} {}",
                            username, request.getMethod(), request.getRequestURI());
                } else {
                    log.warn("Token JWT non valido per utente: {}", username);
                }
            }
        } catch (UsernameNotFoundException e) {
            log.warn("Tentativo di autenticazione con utente inesistente: {}", e.getMessage());
        } catch (Exception e) {
            log.error("Errore durante l'autenticazione JWT: {} - Path: {}",
                    e.getMessage(), request.getRequestURI());
        }

        // Passa la richiesta al prossimo filtro
        filterChain.doFilter(request, response);
    }
}