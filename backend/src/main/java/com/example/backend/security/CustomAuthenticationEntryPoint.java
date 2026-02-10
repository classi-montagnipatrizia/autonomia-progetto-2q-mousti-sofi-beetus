package com.example.backend.security;

import com.example.backend.dtos.response.ErrorResponseDTO;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.stereotype.Component;

import java.io.IOException;

/**
 * Gestisce gli errori di autenticazione (401 Unauthorized).
 * Viene chiamato quando un utente prova ad accedere a una risorsa protetta senza essere autenticato.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class CustomAuthenticationEntryPoint implements AuthenticationEntryPoint {

    // Inietta l'ObjectMapper di Spring
    private final ObjectMapper objectMapper;

    @Override
    public void commence(
            HttpServletRequest request,
            HttpServletResponse response,
            AuthenticationException authException) throws IOException, ServletException {

        log.warn("Tentativo di accesso non autorizzato a: {} - {}",
                request.getMethod(), request.getRequestURI());

        // Crea response di errore standardizzata
        ErrorResponseDTO errorResponse = ErrorResponseDTO.builder()
                .status(HttpStatus.UNAUTHORIZED.value())
                .error("Unauthorized")
                .message("Autenticazione richiesta. Fornire un token JWT valido.")
                .path(request.getRequestURI())
                .build();

        // Imposta response
        response.setStatus(HttpStatus.UNAUTHORIZED.value());
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.setCharacterEncoding("UTF-8");

        // Scrive JSON response
        response.getWriter().write(objectMapper.writeValueAsString(errorResponse));
    }
}