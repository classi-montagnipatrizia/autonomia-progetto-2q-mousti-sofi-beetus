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
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.web.access.AccessDeniedHandler;
import org.springframework.stereotype.Component;

import java.io.IOException;

/**
 * Gestisce gli errori di autorizzazione (403 Forbidden).
 * Viene chiamato quando un utente autenticato prova ad accedere a una risorsa per cui non ha permessi.
 */
@Component
@Slf4j
@RequiredArgsConstructor
public class CustomAccessDeniedHandler implements AccessDeniedHandler {

    private final ObjectMapper objectMapper;

    @Override
    public void handle(
            HttpServletRequest request,
            HttpServletResponse response,
            AccessDeniedException accessDeniedException) throws IOException, ServletException {

        log.warn("Accesso negato a: {} {} - Motivo: {}",
                request.getMethod(), request.getRequestURI(), accessDeniedException.getMessage());

        // Crea response di errore standardizzata
        ErrorResponseDTO errorResponse = ErrorResponseDTO.builder()
                .status(HttpStatus.FORBIDDEN.value())
                .error("Forbidden")
                .message("Non hai i permessi per accedere a questa risorsa.")
                .path(request.getRequestURI())
                .build();

        // Imposta response
        response.setStatus(HttpStatus.FORBIDDEN.value());
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.setCharacterEncoding("UTF-8");

        // Scrive JSON response
        response.getWriter().write(objectMapper.writeValueAsString(errorResponse));
    }
}