package com.example.backend.controllers;

import com.example.backend.config.CurrentUser;
import com.example.backend.dtos.request.AggiornaProfiloRequestDTO;
import com.example.backend.dtos.request.CambiaPasswordRequestDTO;
import com.example.backend.dtos.request.DisattivaAccountRequestDTO;
import com.example.backend.dtos.response.UserResponseDTO;
import com.example.backend.dtos.response.UserSummaryDTO;
import com.example.backend.models.User;
import com.example.backend.services.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * Controller REST per la gestione degli utenti.
 * <p>
 * Espone endpoint per:
 * - Gestione profilo (visualizzazione, modifica, disattivazione)
 * - Cambio password
 * - Ricerca utenti e suggerimenti per menzioni
 * - Statistiche attività utente
 * - Validazione disponibilità username/email

 */
@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
@Slf4j
public class UserController {

    private final UserService userService;

    /**
     * Ottiene il profilo completo dell'utente corrente.
     * <p>
     * Endpoint: GET /api/users/me
     * Autenticazione: richiesta
     *
     * @param user utente autenticato (iniettato automaticamente)
     * @return profilo completo con dati personali
     */
    @GetMapping("/me")
    public ResponseEntity<UserResponseDTO> ottieniProfiloProprio(@CurrentUser User user) {

        log.debug("GET /api/users/me - Username: {}", user.getUsername());

        UserResponseDTO profile = userService.ottieniProfiloProprio(user.getId());

        return ResponseEntity.ok(profile);
    }

    /**
     * Ottiene il profilo pubblico di un utente specifico.
     * <p>
     * Endpoint: GET /api/users/{userId}
     * Autenticazione: richiesta
     * <p>
     * Nasconde profili di account disattivati.
     *
     * @param userId ID dell'utente da visualizzare
     * @return profilo pubblico dell'utente
     */
    @GetMapping("/{userId}")
    public ResponseEntity<UserResponseDTO> ottieniProfiloUtente(
            @PathVariable Long userId) {

        log.debug("GET /api/users/{}", userId);

        UserResponseDTO profile = userService.ottieniProfiloUtente(userId);

        return ResponseEntity.ok(profile);
    }

    /**
     * Aggiorna il profilo dell'utente corrente.
     * <p>
     * Endpoint: PUT /api/users/me
     * Autenticazione: richiesta
     * <p>
     * Permette di modificare:
     * - Nome completo
     * - URL immagine profilo
     * - bio se fornita
     *
     * @param request DTO con i campi da aggiornare (validato)
     * @param userDetails utente autenticato
     * @return profilo aggiornato
     */
    @PutMapping("/me")
    public ResponseEntity<UserResponseDTO> aggiornaProfilo(
            @Valid @RequestBody AggiornaProfiloRequestDTO request,
            @CurrentUser User user) {

        log.debug("PUT /api/users/me - Username: {}", user.getUsername());

        UserResponseDTO updatedProfile = userService.aggiornaProfilo(user.getId(), request);

        return ResponseEntity.ok(updatedProfile);
    }

    /**
     * Cambia la password dell'utente corrente.
     * <p>
     * Endpoint: PUT /api/users/me/password
     * Autenticazione: richiesta
     * <p>
     *
     * @param passwordData mappa con vecchia e nuova password
     * @param userDetails utente autenticato
     * @return messaggio di conferma
     */
    @PutMapping("/me/password")
    public ResponseEntity<Map<String, String>> cambiaPassword(
            @Valid @RequestBody CambiaPasswordRequestDTO request,
            @CurrentUser User user) {

        log.debug("PUT /api/users/me/password - Username: {}", user.getUsername());

        userService.cambiaPassword(user.getId(), request.getVecchiaPassword(), request.getNuovaPassword());

        return ResponseEntity.ok(Map.of("message", "Password cambiata con successo"));
    }

    /**
     * Cerca utenti per username o nome completo.
     * <p>
     * Endpoint: GET /api/users/search?q={searchTerm}
     * Autenticazione: richiesta
     * <p>
     * Ricerca case-insensitive su:
     * - Username
     * - Nome completo
     * <p>
     * Filtra solo utenti della stessa classe dell'utente corrente.
     * Supporta paginazione (default 20 risultati per pagina).
     *
     * @param searchTerm termine di ricerca
     * @param user utente autenticato
     * @param pageable parametri paginazione (size, page, sort)
     * @return pagina di utenti trovati nella stessa classe
     */
    @GetMapping("/search")
    public ResponseEntity<Page<UserSummaryDTO>> cercaUtenti(
            @RequestParam("q") String searchTerm,
            @CurrentUser User user,
            @PageableDefault(size = 20, sort = "username", direction = Sort.Direction.ASC)
            Pageable pageable) {

        log.debug("GET /api/users/search?q={} - Classe: {}", searchTerm, user.getClassroom());

        Page<UserSummaryDTO> users = userService.cercaUtenti(searchTerm, user.getId(), pageable);

        return ResponseEntity.ok(users);
    }

    /**
     * Ottiene tutti gli utenti attivi della stessa classe.
     * <p>
     * Endpoint: GET /api/users
     * Autenticazione: richiesta
     * <p>
     * Filtra per classroom per garantire isolamento tra classi.
     * Utile per visualizzare la lista completa dei compagni di classe.
     * Esclude account disattivati.
     * Supporta paginazione (default 20 per pagina, ordinati per username).
     *
     * @param user utente autenticato
     * @param pageable parametri paginazione
     * @return pagina di utenti attivi della stessa classe
     */
    @GetMapping
    public ResponseEntity<Page<UserSummaryDTO>> ottieniTuttiUtenti(
            @CurrentUser User user,
            @PageableDefault(size = 20, sort = "username", direction = Sort.Direction.ASC)
            Pageable pageable) {

        log.debug("GET /api/users - Classe: {}", user.getClassroom());

        Page<UserSummaryDTO> users = userService.ottieniTuttiUtenti(user.getId(), pageable);

        return ResponseEntity.ok(users);
    }

    /**
     * Ottiene le statistiche di attività di un utente.
     * <p>
     * Endpoint: GET /api/users/{userId}/stats
     * Autenticazione: richiesta
     * <p>
     * Restituisce:
     * - Numero post pubblicati
     * - Numero commenti scritti
     * - Like ricevuti sui propri post
     * - Totale interazioni (post + commenti)
     *
     * @param userId ID utente
     * @return mappa con statistiche
     */
    @GetMapping("/{userId}/stats")
    public ResponseEntity<Map<String, Object>> ottieniStatistiche(
            @PathVariable Long userId) {

        log.debug("GET /api/users/{}/stats", userId);

        Map<String, Object> stats = userService.ottieniStatistiche(userId);

        return ResponseEntity.ok(stats);
    }

    /**
     * Verifica se uno username è disponibile per la registrazione.
     * <p>
     * Endpoint: GET /api/users/check/username?username={username}
     * Autenticazione: NON richiesta 
     * <p>
     * Utilizzato per validazione in tempo reale durante la registrazione.
     *
     * @param username username da verificare
     * @return {"disponibile": true/false}
     */
    @GetMapping("/check/username")
    public ResponseEntity<Map<String, Boolean>> verificaUsername(
            @RequestParam String username) {

        log.debug("GET /api/users/check/username?username={}", username);

        boolean disponibile = userService.verificaUsernameDisponibile(username);

        return ResponseEntity.ok(Map.of("disponibile", disponibile));
    }

    /**
     * Verifica se un'email è disponibile per la registrazione.
     * <p>
     * Endpoint: GET /api/users/check/email?email={email}
     * Autenticazione: NON richiesta
     * <p>
     * Utilizzato per validazione in tempo reale durante la registrazione.
     *
     * @param email email da verificare
     * @return {"disponibile": true/false}
     */
    @GetMapping("/check/email")
    public ResponseEntity<Map<String, Boolean>> verificaEmail(
            @RequestParam String email) {

        log.debug("GET /api/users/check/email?email={}", email);

        boolean disponibile = userService.verificaEmailDisponibile(email);

        return ResponseEntity.ok(Map.of("disponibile", disponibile));
    }

    /**
     * Ottiene suggerimenti di username per funzionalità di menzioni.
     * <p>
     * Endpoint: GET /api/users/suggestions/mentions?prefix={prefix}
     * Autenticazione: richiesta
     * <p>
     * Cerca username che iniziano con il prefisso fornito.
     * Utilizzato per autocomplete durante la scrittura di post/commenti.
     * Limita i risultati a 10 per prestazioni.
     *
     * @param prefix prefisso username (es: "@gio")
     * @return lista di massimo 10 suggerimenti
     */
    @GetMapping("/suggestions/mentions")
    public ResponseEntity<List<UserSummaryDTO>> getSuggerimentiMenzioni(
            @RequestParam String prefix) {

        log.debug("GET /api/users/suggestions/mentions?prefix={}", prefix);

        List<UserSummaryDTO> suggestions = userService.getSuggerimentiMenzioni(prefix);

        return ResponseEntity.ok(suggestions);
    }

    /**
     * Disattiva il proprio account utente (soft delete).
     * <p>
     * Endpoint: DELETE /api/users/me
     * Autenticazione: richiesta
     * <p>
     * L'account viene disattivato ma non eliminato dal database.
     * Richiede la password per conferma.
     * Non permette la disattivazione di account admin.
     *
     *
     * @param data mappa contenente la password per conferma
     * @param userDetails utente autenticato
     * @return messaggio di conferma
     */
    @DeleteMapping("/me")
    public ResponseEntity<Map<String, String>> disattivaAccount(
            @Valid @RequestBody DisattivaAccountRequestDTO request,
            @CurrentUser User user) {

        log.debug("DELETE /api/users/me - Username: {}", user.getUsername());

        userService.disattivaAccount(user.getId(), request.getPassword());

        return ResponseEntity.ok(Map.of("message", "Account disattivato con successo"));
    }
}
