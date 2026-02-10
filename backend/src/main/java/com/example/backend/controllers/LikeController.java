package com.example.backend.controllers;

import com.example.backend.config.CurrentUser;
import com.example.backend.dtos.response.UserSummaryDTO;
import com.example.backend.models.User;
import com.example.backend.services.LikeService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * Controller per la gestione dei like ai post.
 * <p>
 * Espone API RESTful per tutte le operazioni sui like.
 * I like seguono il pattern di toggle: mettere like due volte equivale a toglierlo.
 *
 */
@RestController
@RequiredArgsConstructor
@Slf4j
public class LikeController {

    private final LikeService likeService;

    /**
     * POST /api/posts/{postId}/likes
     * Mette o toglie like a un post (toggle).
     * <p>
     * Questo endpoint implementa il comportamento toggle tipico dei social media:
     * - Se l'utente non ha messo like, il like viene aggiunto
     * - Se l'utente ha già messo like, il like viene rimosso
     * - L'utente può mettere like anche ai propri post
     * <p>

     * Codici di stato:
     * - 200 OK: Operazione completata con successo
     * - 401 UNAUTHORIZED: Utente non autenticato
     * - 404 NOT FOUND: Post non trovato o cancellato
     *
     * @param postId L'ID del post
     * @param user   Utente autenticato (iniettato automaticamente)
     * @return Map con lo stato del like e il conteggio aggiornato
     */
    @PostMapping("/api/posts/{postId}/likes")
    public ResponseEntity<Map<String, Object>> toggleLike(
            @PathVariable Long postId,
            @CurrentUser User user) {

        log.debug("POST /api/posts/{}/likes - Username: {}", postId, user.getUsername());

        // Esegue il toggle (aggiunge o rimuove like)
        boolean liked = likeService.toggleLike(postId, user.getId());

        // Ottiene il conteggio aggiornato
        long likesCount = likeService.contaLike(postId);

        // Prepara la risposta
        String message = liked ? "Like aggiunto" : "Like rimosso";

        Map<String, Object> response = Map.of(
                "liked", liked,
                "likesCount", likesCount,
                "message", message
        );

        return ResponseEntity.ok(response);
    }

    /**
     * GET /api/posts/{postId}/likes
     * Ottiene la lista degli utenti che hanno messo like al post.
     * <p>
     * Restituisce una lista paginata di utenti.
     * <p>

     * Codici di stato:
     * - 200 OK: Lista caricata (anche se vuota)
     * - 401 UNAUTHORIZED: Utente non autenticato
     * - 404 NOT FOUND: Post non trovato
     *
     * @param postId   L'ID del post
     * @param pageable Parametri di paginazione (iniettati dalla query string)
     * @param user     Utente autenticato (iniettato automaticamente)
     * @return Page di UserSummaryDTO con gli utenti che hanno messo like
     */
    @GetMapping("/api/posts/{postId}/likes")
    public ResponseEntity<Page<UserSummaryDTO>> ottieniUtentiCheHannoMessoMiPiace(
            @PathVariable Long postId,
            @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC)
            Pageable pageable,
            @CurrentUser User user) {

        log.debug("GET /api/posts/{}/likes - Username: {}, Pagina: {}",
                postId, user.getUsername(), pageable.getPageNumber());

        // Ottiene la lista paginata
        Page<UserSummaryDTO> users = likeService.ottieniUtentiCheHannoMessoMiPiace(postId, pageable);

        return ResponseEntity.ok(users);
    }

    /**
     * GET /api/posts/{postId}/likes/check
     * Verifica se l'utente corrente ha messo like al post.

     * Codici di stato:
     * - 200 OK: Verifica completata
     * - 401 UNAUTHORIZED: Utente non autenticato
     *
     * @param postId L'ID del post
     * @param user   Utente autenticato (iniettato automaticamente)
     * @return Map con il campo hasLiked (boolean)
     */
    @GetMapping("/api/posts/{postId}/likes/check")
    public ResponseEntity<Map<String, Boolean>> verificaLike(
            @PathVariable Long postId,
            @CurrentUser User user) {

        log.debug("GET /api/posts/{}/likes/check - Username: {}",
                postId, user.getUsername());

        // Verifica se ha messo like
        boolean hasLiked = likeService.hasMessoLike(postId, user.getId());

        return ResponseEntity.ok(Map.of("hasLiked", hasLiked));
    }
}