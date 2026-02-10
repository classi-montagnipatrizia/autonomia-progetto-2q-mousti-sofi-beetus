package com.example.backend.controllers;

import com.example.backend.config.CurrentUser;
import com.example.backend.dtos.request.CreaCommentoRequestDTO;
import com.example.backend.dtos.response.CommentResponseDTO;
import com.example.backend.models.User;
import com.example.backend.services.CommentService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Controller per la gestione dei commenti ai post.
 *
 * Gestisce sia i commenti principali che le risposte.
 * La struttura degli URL riflette la gerarchia: i commenti appartengono ai post.
 *
 * Pattern URL:
 * - /api/posts/{postId}/comments - Operazioni sui commenti di un post specifico
 * - /api/comments/{commentId} - Operazioni su un singolo commento
 * - /api/comments/{commentId}/hide - Sub-risorse del commento
 */
@RestController
@RequiredArgsConstructor
@Slf4j
public class CommentController {

    private final CommentService commentService;

    /**
     * POST /api/posts/{postId}/comments
     * Crea un nuovo commento o una risposta.
     *
     * Questo endpoint gestisce sia i commenti principali che le risposte.
     * - Per creare un commento principale: non includere parentCommentId nel body
     * - Per creare una risposta: includi parentCommentId nel body

     * Codici di stato:
     * - 201 CREATED: Commento creato con successo
     * - 400 BAD REQUEST: Dati non validi o violazione delle regole business
     * - 401 UNAUTHORIZED: Utente non autenticato
     * - 404 NOT FOUND: Post o commento padre non trovato
     *
     * @param postId  L'ID del post a cui commentare
     * @param request DTO con contenuto e eventuale parentCommentId
     * @param user    Utente autenticato (iniettato automaticamente)
     * @return CommentResponseDTO con i dati del commento appena creato
     */
    @PostMapping("/api/posts/{postId}/comments")
    public ResponseEntity<CommentResponseDTO> creaCommento(
            @PathVariable Long postId,
            @Valid @RequestBody CreaCommentoRequestDTO request,
            @CurrentUser User user) {

        log.debug("POST /api/posts/{}/comments - Username: {}", postId, user.getUsername());

        // Delega la creazione al service
        CommentResponseDTO comment = commentService.creaCommento(postId, user.getId(), request);

        // Restituisce 201 CREATED con il commento nel body
        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(comment);
    }

    /**
     * GET /api/posts/{postId}/comments
     * Ottiene tutti i commenti di un post.
     *
     * Restituisce i commenti con struttura gerarchica:
     * - Ogni commento principale ha una lista "risposte" con le sue risposte
     * - Le risposte hanno il campo "parentCommentId" valorizzato
     *
     *
     * Codici di stato:
     * - 200 OK: Commenti caricati con successo
     * - 401 UNAUTHORIZED: Utente non autenticato
     * - 404 NOT FOUND: Post non trovato
     *
     * @param postId L'ID del post
     * @param user   Utente autenticato (iniettato automaticamente)
     * @return Lista di CommentResponseDTO con struttura gerarchica
     */
    @GetMapping("/api/posts/{postId}/comments")
    public ResponseEntity<List<CommentResponseDTO>> ottieniCommentiPost(
            @PathVariable Long postId,
            @CurrentUser User user) {

        log.debug("GET /api/posts/{}/comments - Username: {}", postId, user.getUsername());

        // Ottiene i commenti
        List<CommentResponseDTO> comments = commentService.ottieniCommentiPost(postId, user.getId());

        return ResponseEntity.ok(comments);
    }

    /**
     * PUT /api/comments/{commentId}
     * Modifica un commento esistente.
     *
     * Permette all'autore di modificare il contenuto di un commento.
     * Solo l'autore può modificare il proprio commento.
     *
     * Il campo updatedAt viene aggiornato automaticamente, permettendo al frontend
     * di mostrare "Modificato" se updatedAt è diverso da createdAt.
     *
     *
     * Codici di stato:
     * - 200 OK: Commento modificato con successo
     * - 400 BAD REQUEST: Contenuto non valido (vuoto o troppo lungo)
     * - 401 UNAUTHORIZED: Utente non autenticato
     * - 403 FORBIDDEN: L'utente non è l'autore del commento
     * - 404 NOT FOUND: Commento non trovato o cancellato
     *
     * @param commentId L'ID del commento da modificare
     * @param request   DTO con il nuovo contenuto
     * @param user      Utente autenticato (iniettato automaticamente)
     * @return CommentResponseDTO con i dati aggiornati
     */
    @PutMapping("/api/comments/{commentId}")
    public ResponseEntity<CommentResponseDTO> modificaCommento(
            @PathVariable Long commentId,
            @Valid @RequestBody CreaCommentoRequestDTO request,
            @CurrentUser User user) {

        log.debug("PUT /api/comments/{} - Username: {}", commentId, user.getUsername());

        // Modifica il commento

        // Il campo parentCommentId viene ignorato durante la modifica.
        CommentResponseDTO comment = commentService.modificaCommento(
                commentId,
                user.getId(),
                request.getContenuto()
        );

        return ResponseEntity.ok(comment);
    }

    /**
     * DELETE /api/comments/{commentId}
     * Elimina un commento.
     *
     * Esegue un soft delete: il commento viene marcato come cancellato ma non eliminato fisicamente.
     * Solo l'autore può eliminare il proprio commento.
     *
     * Comportamento con risposte:
     * - Se il commento ha risposte, queste rimangono visibili
     * - Il commento viene mostrato come "[Commento eliminato]" nel frontend
     * - La struttura della conversazione viene mantenuta
     *

     * Codici di stato:
     * - 204 NO CONTENT: Commento eliminato con successo
     * - 401 UNAUTHORIZED: Utente non autenticato
     * - 403 FORBIDDEN: L'utente non è l'autore del commento
     * - 404 NOT FOUND: Commento non trovato
     *
     * @param commentId L'ID del commento da eliminare
     * @param user      Utente autenticato (iniettato automaticamente)
     * @return ResponseEntity vuoto con status 204
     */
    @DeleteMapping("/api/comments/{commentId}")
    public ResponseEntity<Void> eliminaCommento(
            @PathVariable Long commentId,
            @CurrentUser User user) {

        log.debug("DELETE /api/comments/{} - Username: {}", commentId, user.getUsername());

        // Elimina il commento
        commentService.eliminaCommento(commentId, user.getId());

        return ResponseEntity.noContent().build();
    }

    /**
     * POST /api/comments/{commentId}/hide
     * Nasconde un commento.
     *

     * Codici di stato:
     * - 200 OK: Commento nascosto con successo
     * - 401 UNAUTHORIZED: Utente non autenticato
     * - 404 NOT FOUND: Commento non trovato
     *

     * @param commentId L'ID del commento da nascondere
     * @param user      Utente autenticato (iniettato automaticamente)
     * @return ResponseEntity vuoto con status 200
     */
    @PostMapping("/api/comments/{commentId}/hide")
    public ResponseEntity<Void> nascondiCommento(
            @PathVariable Long commentId,
            @CurrentUser User user) {

        log.debug("POST /api/comments/{}/hide - Username: {}", commentId, user.getUsername());

        // Nasconde il commento
        commentService.nascondiCommento(commentId, user.getId());

        return ResponseEntity.ok().build();
    }

    /**
     * DELETE /api/comments/{commentId}/hide
     * Mostra un commento precedentemente nascosto.

     * @param commentId L'ID del commento da mostrare
     * @param user      Utente autenticato (iniettato automaticamente)
     * @return ResponseEntity vuoto con status 200
     */
    @DeleteMapping("/api/comments/{commentId}/hide")
    public ResponseEntity<Void> mostraCommento(
            @PathVariable Long commentId,
            @CurrentUser User user) {

        log.debug("DELETE /api/comments/{}/hide - Username: {}", commentId, user.getUsername());

        // Mostra il commento
        commentService.mostraCommento(commentId, user.getId());

        return ResponseEntity.ok().build();
    }
}