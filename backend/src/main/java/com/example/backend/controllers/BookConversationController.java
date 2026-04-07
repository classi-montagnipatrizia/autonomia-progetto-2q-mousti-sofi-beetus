package com.example.backend.controllers;

import com.example.backend.config.CurrentUser;
import com.example.backend.dtos.request.InviaMessaggioLibroRequestDTO;
import com.example.backend.dtos.response.BookConversationDTO;
import com.example.backend.dtos.response.BookMessageDTO;
import com.example.backend.models.User;
import com.example.backend.services.BookConversationService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/books")
@RequiredArgsConstructor
@Slf4j
public class BookConversationController {

    private final BookConversationService conversationService;

    /**
     * GET /api/books/conversations
     * Lista di tutte le conversazioni libreria dell'utente (venditore o acquirente),
     * ordinate per ultima attività.
     */
    @GetMapping("/conversations")
    public ResponseEntity<List<BookConversationDTO>> getMyConversations(
            @CurrentUser User user) {
        log.debug("GET /api/books/conversations - Username: {}", user.getUsername());
        List<BookConversationDTO> conversations = conversationService.getMyConversations(user.getId());
        return ResponseEntity.ok(conversations);
    }

    /**
     * GET /api/books/{bookId}/conversations/mine
     * Restituisce la conversazione esistente dell'utente per quel libro (404 se non esiste).
     * Usato dal frontend quando l'utente clicca "Contatta" su un libro con cui
     * ha già parlato in precedenza, per caricare i messaggi precedenti.
     * Non crea nessuna conversazione.
     */
    @GetMapping("/{bookId}/conversations/mine")
    public ResponseEntity<BookConversationDTO> getMiaConversazione(
            @PathVariable Long bookId,
            @CurrentUser User user) {
        log.debug("GET /api/books/{}/conversations/mine - Username: {}", bookId, user.getUsername());
        BookConversationDTO conversation = conversationService.getMiaConversazione(bookId, user.getId());
        return ResponseEntity.ok(conversation);
    }

    /**
     * GET /api/books/conversations/{convId}
     * Restituisce una conversazione per ID (usato dal venditore che clicca dalla lista messaggi).
     */
    @GetMapping("/conversations/{convId}")
    public ResponseEntity<BookConversationDTO> getConversazioneById(
            @PathVariable Long convId,
            @CurrentUser User user) {
        log.debug("GET /api/books/conversations/{} - Username: {}", convId, user.getUsername());
        BookConversationDTO conversation = conversationService.getConversazioneById(convId, user.getId());
        return ResponseEntity.ok(conversation);
    }

    /**
     * GET /api/books/conversations/{convId}/messages
     * Messaggi di una conversazione, paginati in ordine cronologico crescente.
     */
    @GetMapping("/conversations/{convId}/messages")
    public ResponseEntity<Page<BookMessageDTO>> getMessages(
            @PathVariable Long convId,
            @PageableDefault(size = 50, sort = "createdAt", direction = Sort.Direction.ASC) Pageable pageable,
            @CurrentUser User user) {
        log.debug("GET /api/books/conversations/{}/messages - Username: {}", convId, user.getUsername());
        Page<BookMessageDTO> messages = conversationService.getMessages(convId, user.getId(), pageable);
        return ResponseEntity.ok(messages);
    }

    /**
     * POST /api/books/{bookId}/messages
     * Invia un messaggio relativo a un libro.
     * Implementa findOrCreate: se la conversazione non esiste ancora, viene creata
     * automaticamente al primo messaggio. La risposta include il conversationId
     * così il frontend può usarlo per le chiamate successive.
     */
    @PostMapping("/{bookId}/messages")
    public ResponseEntity<BookMessageDTO> inviaMessaggio(
            @PathVariable Long bookId,
            @Valid @RequestBody InviaMessaggioLibroRequestDTO request,
            @CurrentUser User user) {
        log.debug("POST /api/books/{}/messages - Username: {}", bookId, user.getUsername());
        BookMessageDTO message = conversationService.inviaMessaggio(bookId, user.getId(), request.getContenuto(), request.getConversationId());
        return ResponseEntity.status(HttpStatus.CREATED).body(message);
    }

    /**
     * DELETE /api/books/messages/{messageId}
     * Elimina un messaggio della libreria (soft delete, solo mittente).
     */
    @DeleteMapping("/messages/{messageId}")
    public ResponseEntity<Void> eliminaMessaggio(
            @PathVariable Long messageId,
            @CurrentUser User user) {
        log.debug("DELETE /api/books/messages/{} - Username: {}", messageId, user.getUsername());
        conversationService.eliminaMessaggio(messageId, user.getId());
        return ResponseEntity.noContent().build();
    }

    /**
     * DELETE /api/books/conversations/{convId}
     * Nasconde una conversazione per l'utente corrente.
     * L'altro utente continua a vederla normalmente.
     */
    @DeleteMapping("/conversations/{convId}")
    public ResponseEntity<Void> nascondiConversazione(
            @PathVariable Long convId,
            @CurrentUser User user) {
        log.debug("DELETE /api/books/conversations/{} - Username: {}", convId, user.getUsername());
        conversationService.nascondiConversazione(convId, user.getId());
        return ResponseEntity.noContent().build();
    }

    /**
     * PATCH /api/books/conversations/{convId}/read
     * Segna come letti tutti i messaggi ricevuti dall'utente in questa conversazione.
     */
    @PatchMapping("/conversations/{convId}/read")
    public ResponseEntity<Void> markAsRead(
            @PathVariable Long convId,
            @CurrentUser User user) {
        log.debug("PATCH /api/books/conversations/{}/read - Username: {}", convId, user.getUsername());
        conversationService.markAsRead(convId, user.getId());
        return ResponseEntity.ok().build();
    }
}
