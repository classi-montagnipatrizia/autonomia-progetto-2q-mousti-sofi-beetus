package com.example.backend.controllers;

import com.example.backend.config.CurrentUser;
import com.example.backend.dtos.request.AnalizzaLibroRequestDTO;
import com.example.backend.dtos.request.ChatbotRequestDTO;
import com.example.backend.dtos.response.AnalizzaLibroResponseDTO;
import com.example.backend.dtos.response.ChatbotResponseDTO;
import com.example.backend.models.User;
import com.example.backend.services.GeminiService;
import com.example.backend.services.GroqService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/ai")
@RequiredArgsConstructor
@Slf4j
public class AIController {

    private final GeminiService geminiService;
    private final GroqService groqService;

    /**
     * POST /api/ai/analizza-libro
     * Analizza le foto di un libro scolastico con Gemini Vision e restituisce
     * i dati pre-compilati (titolo, autore, prezzo, condizione, ecc.).
     * Usato dal modal "Vendi un libro" dopo l'upload delle foto.
     */
    @PostMapping("/analizza-libro")
    public ResponseEntity<AnalizzaLibroResponseDTO> analizzaLibro(
            @Valid @RequestBody AnalizzaLibroRequestDTO request,
            @CurrentUser User user) {
        log.debug("POST /api/ai/analizza-libro - Username: {}", user.getUsername());
        AnalizzaLibroResponseDTO result = geminiService.analizzaLibro(
                request.getFrontImageUrl(),
                request.getBackImageUrl()
        );
        return ResponseEntity.ok(result);
    }

    /**
     * POST /api/ai/chatbot
     * Chatbot assistente libreria: riceve una domanda in linguaggio naturale
     * e risponde con testo + eventuali card libro pertinenti.
     * Usato dal modal chatbot nella pagina libreria.
     */
    @PostMapping("/chatbot")
    public ResponseEntity<ChatbotResponseDTO> chatbot(
            @Valid @RequestBody ChatbotRequestDTO request,
            @CurrentUser User user) {
        log.debug("POST /api/ai/chatbot - Username: {}", user.getUsername());
        ChatbotResponseDTO result = groqService.chatbot(request.getMessaggio(), user.getId());
        return ResponseEntity.ok(result);
    }
}
