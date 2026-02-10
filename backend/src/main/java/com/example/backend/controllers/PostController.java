package com.example.backend.controllers;

import com.example.backend.config.CurrentUser;
import com.example.backend.dtos.request.CreaPostRequestDTO;
import com.example.backend.dtos.request.ModificaPostRequestDTO;
import com.example.backend.dtos.response.PostDettaglioResponseDTO;
import com.example.backend.dtos.response.PostResponseDTO;
import com.example.backend.models.User;
import com.example.backend.services.PostService;
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

/**
 * Controller per la gestione dei post.
 * Espone API RESTful per tutte le operazioni sui post.
 * <p>
 * Tutti gli endpoint richiedono autenticazione.
 * L'utente autenticato viene iniettato automaticamente
 * tramite @AuthenticationPrincipal.
 * <p>
 * 
 */
@RestController
@RequestMapping("/api/posts")
@RequiredArgsConstructor
@Slf4j
public class PostController {

    private final PostService postService;

    /**
     * POST /api/posts
     * Crea un nuovo post.
     * <p>
     * Questo endpoint permette a un utente autenticato di creare un nuovo post.
     * Il post può contenere testo, un'immagine, oppure entrambi.
     *
     * @param request     DTO con i dati del post da creare
     * @param userDetails Dettagli dell'utente autenticato (iniettato
     *                    automaticamente)
     * @return ResponseEntity con il post creato e status 201
     */
    @PostMapping
    public ResponseEntity<PostResponseDTO> creaPost(
            @Valid @RequestBody CreaPostRequestDTO request,
            @CurrentUser User user) {

        log.debug("POST /api/posts - Username: {}", user.getUsername());

        // Recupera l'ID dell'utente autenticato e delega la creazione al service
        PostResponseDTO post = postService.creaPost(user.getId(), request);

        // Restituisce 201 CREATED con il post nel body

        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(post);
    }

    /**
     * GET /api/posts
     * Ottiene il feed dei post.
     * <p>
     * Questo è l'endpoint principale per la home page.
     * Restituisce tutti i post visibili all'utente, paginati.
     * <p>
     * Parametri query (opzionali):
     * - page: Numero della pagina (default 0)
     * - size: Elementi per pagina (default 20)
     * - sort: Campo per ordinamento (default createdAt,desc)
     * <p>
     *
     * @param pageable    Parametri di paginazione (iniettati automaticamente dalla
     *                    query string)
     * @param userDetails Dettagli dell'utente autenticato
     * @return Page di PostResponseDTO con i post del feed
     */
    @GetMapping
    public ResponseEntity<Page<PostResponseDTO>> ottieniFeed(
            @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable,
            @CurrentUser User user) {

        log.debug("GET /api/posts - Username: {}, Pagina: {}",
                user.getUsername(), pageable.getPageNumber());

      

        //Recupera l'ID dell'utente e ottiene il feed
        Page<PostResponseDTO> feed = postService.ottieniFeed(user.getId(), pageable);

        return ResponseEntity.ok(feed);
    }

    /**
     * GET /api/posts/{postId}
     * Ottiene i dettagli completi di un singolo post.
     * <p>
     * Restituisce il post con tutti i suoi dettagli, inclusi tutti i commenti.
     * Questo endpoint viene chiamato quando l'utente clicca su un post per
     * visualizzarlo.
     * <p>
     *
     * @param postId      L'ID del post da visualizzare
     * @param userDetails Dettagli dell'utente autenticato
     * @return PostDettaglioResponseDTO con tutti i dettagli del post
     */
    @GetMapping("/{postId}")
    public ResponseEntity<PostDettaglioResponseDTO> ottieniPost(
            @PathVariable Long postId,
            @CurrentUser User user) {

        log.debug("GET /api/posts/{} - Username: {}", postId, user.getUsername());

  

        // Ottiene il post con tutti i dettagli
        PostDettaglioResponseDTO post = postService.ottieniPost(postId, user.getId());

        return ResponseEntity.ok(post);
    }

    /**
     * PUT /api/posts/{postId}
     * Modifica un post esistente.
     * <p>
     * Permette all'autore di modificare il contenuto testuale del post.
     * Solo l'autore può modificare il proprio post.
     *
     * @param postId      L'ID del post da modificare
     * @param request     DTO con il nuovo contenuto
     * @param userDetails Dettagli dell'utente autenticato
     * @return PostResponseDTO con i dati aggiornati del post
     */
    @PutMapping("/{postId}")
    public ResponseEntity<PostResponseDTO> modificaPost(
            @PathVariable Long postId,
            @Valid @RequestBody ModificaPostRequestDTO request,
            @CurrentUser User user) {

        log.debug("PUT /api/posts/{} - Username: {}", postId, user.getUsername());

       

        // Modifica il post
        PostResponseDTO post = postService.modificaPost(postId, user.getId(), request);

        return ResponseEntity.ok(post);
    }

    /**
     * DELETE /api/posts/{postId}
     * Elimina un post.
     *
     * @param postId      L'ID del post da eliminare
     * @param userDetails Dettagli dell'utente autenticato
     * @return ResponseEntity vuoto con status 204
     */
    @DeleteMapping("/{postId}")
    public ResponseEntity<Void> eliminaPost(
            @PathVariable Long postId,
            @CurrentUser User user) {

        log.debug("DELETE /api/posts/{} - Username: {}", postId, user.getUsername());

      

        // Elimina il post
        postService.eliminaPost(postId, user.getId());

        // 204 NO CONTENT è lo status corretto per una DELETE riuscita
        // Non restituiamo nessun body, solo lo status code
        return ResponseEntity.noContent().build();
    }

    /**
     * GET /api/posts/search
     * Cerca post per parola chiave.
     * <p>
     * Implementa la funzionalità di ricerca del social network.
     * Cerca nei contenuti dei post e negli username/nomi degli autori.
     * <p>
     * Parametri query:
     * - q: Termine di ricerca (obbligatorio)
     * - page: Numero della pagina (opzionale, default 0)
     * - size: Elementi per pagina (opzionale, default 20)
     *
     * @param searchTerm  Il termine da cercare (parametro query 'q')
     * @param pageable    Parametri di paginazione
     * @param userDetails Dettagli dell'utente autenticato
     * @return Page di PostResponseDTO con i risultati della ricerca
     */
    @GetMapping("/search")
    public ResponseEntity<Page<PostResponseDTO>> cercaPost(
            @RequestParam("q") String searchTerm,
            @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable,
            @CurrentUser User user) {

        log.debug("GET /api/posts/search?q={} - Username: {}", searchTerm, user.getUsername());

      

        // Esegue la ricerca
        Page<PostResponseDTO> risultati = postService.cercaPost(searchTerm, user.getId(), pageable);

        return ResponseEntity.ok(risultati);
    }

    /**
     * GET /api/posts/user/{userId}
     * Ottiene i post di un utente specifico.
     * <p>
     * Questo endpoint viene usato per visualizzare i post nel profilo di un utente.
     * Mostra tutti i post pubblici dell'utente, escludendo quelli nascosti
     * dall'utente corrente.
     *
     * @param userId      L'ID dell'utente di cui visualizzare i post
     * @param pageable    Parametri di paginazione
     * @param userDetails Dettagli dell'utente autenticato
     * @return Page di PostResponseDTO con i post dell'utente
     */
    @GetMapping("/user/{userId}")
    public ResponseEntity<Page<PostResponseDTO>> ottieniPostUtente(
            @PathVariable Long userId,
            @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable,
            @CurrentUser User user) {

        log.debug("GET /api/posts/user/{} - Username: {}", userId, user.getUsername());

        // Ottiene i post dell'utente specificato
        Page<PostResponseDTO> posts = postService.ottieniPostUtente(userId, user.getId(), pageable);

        return ResponseEntity.ok(posts);
    }

    /**
     * POST /api/posts/{postId}/hide
     * Nasconde un post.
     * <p>
     * Nasconde un post per l'utente corrente. Il post non verrà più mostrato
     * nel feed o nel profilo dell'autore quando visualizzato dall'utente corrente.
     * <p>
     * Casi d'uso:
     * - Nascondere spoiler
     * - Nascondere contenuti che non interessano
     * - Nascondere post ripetitivi
     *
     * @param postId      L'ID del post da nascondere
     * @param userDetails Dettagli dell'utente autenticato
     * @return ResponseEntity vuoto con status 200
     */
    @PostMapping("/{postId}/hide")
    public ResponseEntity<Void> nascondiPost(
            @PathVariable Long postId,
            @CurrentUser User user) {

        log.debug("POST /api/posts/{}/hide - Username: {}", postId, user.getUsername());

     

        // Nasconde il post
        postService.nascondiPost(postId, user.getId());

        return ResponseEntity.ok().build();
    }

    /**
     * DELETE /api/posts/{postId}/hide
     * Mostra un post precedentemente nascosto.
     * <p>
     * Annulla l'operazione di nascondimento, rendendo il post nuovamente visibile
     * all'utente corrente nel feed e nel profilo dell'autore.
     *
     * @param postId      L'ID del post da mostrare
     * @param userDetails Dettagli dell'utente autenticato
     * @return ResponseEntity vuoto con status 200
     */
    @DeleteMapping("/{postId}/hide")
    public ResponseEntity<Void> mostraPost(
            @PathVariable Long postId,
            @CurrentUser User user) {

        log.debug("DELETE /api/posts/{}/hide - Username: {}", postId, user.getUsername());

    
        // Mostra il post
        postService.mostraPost(postId, user.getId());

        return ResponseEntity.ok().build();
    }
}