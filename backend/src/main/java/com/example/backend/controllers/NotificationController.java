package com.example.backend.controllers;

import com.example.backend.config.CurrentUser;
import com.example.backend.dtos.response.NotificationResponseDTO;
import com.example.backend.models.User;
import com.example.backend.services.NotificationService;
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
 * Controller per la gestione delle notifiche utente.
 * <p>
 * Espone API RESTful per tutte le operazioni sulle notifiche.
 * Le notifiche tengono informati gli utenti su:
 * - Like ricevuti sui propri post
 * - Commenti ai propri post o commenti
 * - Menzioni in post, commenti 
 * - Nuovi messaggi diretti ricevuti
 */
@RestController
@RequestMapping("/api/notifications")
@RequiredArgsConstructor
@Slf4j
public class NotificationController {

    private final NotificationService notificationService;

    /**
     * GET /api/notifications
     * Ottiene tutte le notifiche dell'utente in formato paginato.
     * <p>
     * Le notifiche sono ordinate dalla più recente alla più vecchia.
     * Include sia notifiche lette che non lette.
     * <p>
     * P
     * Codici di stato:
     * - 200 OK: Lista caricata con successo
     * - 401 UNAUTHORIZED: Utente non autenticato
     *
     * @param pageable    Parametri di paginazione (iniettati dalla query string)
     * @param userDetails Dettagli dell'utente autenticato (iniettato automaticamente)
     * @return Page di NotificationResponseDTO
     */
    @GetMapping
    public ResponseEntity<Page<NotificationResponseDTO>> ottieniNotifiche(
            @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC)
            Pageable pageable,
            @CurrentUser User user) {

        log.debug("GET /api/notifications - Username: {}, Pagina: {}",
                user.getUsername(), pageable.getPageNumber());

        Page<NotificationResponseDTO> notifications = notificationService
                .ottieniNotifiche(user.getId(), pageable);

        return ResponseEntity.ok(notifications);
    }

    /**
     * GET /api/notifications/unread
     * Ottiene solo le notifiche non ancora lette dall'utente.
     *
     * Codici di stato:
     * - 200 OK: Lista caricata (può essere vuota)
     * - 401 UNAUTHORIZED: Utente non autenticato
     *
     * @param userDetails Dettagli dell'utente autenticato
     * @return Lista di NotificationResponseDTO non lette
     */
    @GetMapping("/unread")
    public ResponseEntity<List<NotificationResponseDTO>> ottieniNotificheNonLette(
            @CurrentUser User user) {

        log.debug("GET /api/notifications/unread - Username: {}",
                user.getUsername());

        List<NotificationResponseDTO> notifications = notificationService
                .ottieniNotificheNonLette(user.getId());

        return ResponseEntity.ok(notifications);
    }

    /**
     * GET /api/notifications/recent
     * Ottiene le ultime N notifiche dell'utente.
     * <p>
     * Progettato per popolare il dropdown delle notifiche nell'header
     * senza caricare tutte le notifiche dell'utente.
     *
     * Codici di stato:
     * - 200 OK: Lista caricata (può contenere meno di N elementi se non disponibili)
     * - 401 UNAUTHORIZED: Utente non autenticato
     *
     * @param limit       Numero massimo di notifiche da restituire
     * @param userDetails Dettagli dell'utente autenticato
     * @return Lista delle ultime N notifiche
     */
    @GetMapping("/recent")
    public ResponseEntity<List<NotificationResponseDTO>> ottieniNotificheRecenti(
            @RequestParam(defaultValue = "10") int limit,
            @CurrentUser User user) {

        log.debug("GET /api/notifications/recent?limit={} - Username: {}",
                limit, user.getUsername());

        List<NotificationResponseDTO> notifications = notificationService
                .ottieniNotificheRecenti(user.getId(), limit);

        return ResponseEntity.ok(notifications);
    }

    /**
     * GET /api/notifications/count
     * Conta il numero di notifiche non lette dell'utente.

     * Codici di stato:
     * - 200 OK: Conteggio restituito con successo
     * - 401 UNAUTHORIZED: Utente non autenticato
     *
     * @param userDetails Dettagli dell'utente autenticato
     * @return Map con il campo unreadCount (long)
     */
    @GetMapping("/count")
    public ResponseEntity<Map<String, Long>> contaNotificheNonLette(
            @CurrentUser User user) {

        log.debug("GET /api/notifications/count - Username: {}",
                user.getUsername());

        long count = notificationService.contaNotificheNonLette(user.getId());

        return ResponseEntity.ok(Map.of("unreadCount", count));
    }

    /**
     * PUT /api/notifications/{notificationId}/read
     * Marca una singola notifica come letta.
     * <p>
     * Viene chiamato quando:
     * - L'utente clicca su una notifica per visualizzarla
     * - L'utente visualizza manualmente una notifica
     * <p>
     * Verifica automaticamente che la notifica appartenga all'utente autenticato.
     * <p>
     * Codici di stato:
     * - 200 OK: Notifica marcata come letta
     * - 401 UNAUTHORIZED: Utente non autenticato
     * - 403 FORBIDDEN: La notifica non appartiene all'utente
     * - 404 NOT FOUND: Notifica non trovata
     *
     * @param notificationId L'ID della notifica da marcare come letta
     * @param userDetails    Dettagli dell'utente autenticato
     * @return ResponseEntity vuoto
     */
    @PutMapping("/{notificationId}/read")
    public ResponseEntity<Void> marcaComeLetta(
            @PathVariable Long notificationId,
            @CurrentUser User user) {

        log.debug("PUT /api/notifications/{}/read - Username: {}",
                notificationId, user.getUsername());

        notificationService.marcaComeLetta(notificationId, user.getId());

        return ResponseEntity.ok().build();
    }

    /**
     * PUT /api/notifications/read-all
     * Marca tutte le notifiche dell'utente come lette.
     * <p>
     * Funzionalità "Segna tutte come lette" che azzera il contatore
     * delle notifiche non lette senza doverle eliminare.
     *
     * Codici di stato:
     * - 200 OK: Tutte le notifiche marcate come lette
     * - 401 UNAUTHORIZED: Utente non autenticato
     *
     * @param userDetails Dettagli dell'utente autenticato
     * @return ResponseEntity vuoto
     */
    @PutMapping("/read-all")
    public ResponseEntity<Void> marcaTutteComeLette(
            @CurrentUser User user) {

        log.debug("PUT /api/notifications/read-all - Username: {}",
                user.getUsername());

        notificationService.marcaTutteComeLette(user.getId());

        return ResponseEntity.ok().build();
    }

    /**
     * DELETE /api/notifications/{notificationId}
     * Elimina una singola notifica.
     * <p>
     * L'utente può eliminare le proprie notifiche per fare pulizia.
     * Verifica automaticamente che la notifica appartenga all'utente autenticato.
     * <p>
     * Codici di stato:
     * - 204 NO CONTENT: Notifica eliminata con successo
     * - 401 UNAUTHORIZED: Utente non autenticato
     * - 403 FORBIDDEN: La notifica non appartiene all'utente
     * - 404 NOT FOUND: Notifica non trovata
     *
     * @param notificationId L'ID della notifica da eliminare
     * @param userDetails    Dettagli dell'utente autenticato
     * @return ResponseEntity vuoto con status 204
     */
    @DeleteMapping("/{notificationId}")
    public ResponseEntity<Void> eliminaNotifica(
            @PathVariable Long notificationId,
            @CurrentUser User user) {

        log.debug("DELETE /api/notifications/{} - Username: {}",
                notificationId, user.getUsername());

        notificationService.eliminaNotifica(notificationId, user.getId());

        return ResponseEntity.noContent().build();
    }

    /**
     * DELETE /api/notifications/read
     * Elimina tutte le notifiche già lette dell'utente.
     * <p>
     * Funzionalità di pulizia che mantiene solo le notifiche non lette.
     * Utile per gli utenti che vogliono fare ordine nelle notifiche
     * senza perdere quelle che non hanno ancora visualizzato.
     * <p>
     * Restituisce il numero di notifiche eliminate nella risposta.
     * <p>
     * Codici di stato:
     * - 200 OK: Notifiche eliminate con successo
     * - 401 UNAUTHORIZED: Utente non autenticato
     *
     * @param userDetails Dettagli dell'utente autenticato
     * @return Map con il campo deletedCount (numero di notifiche eliminate)
     */
    @DeleteMapping("/read")
    public ResponseEntity<Map<String, Integer>> eliminaNotificheLette(
            @CurrentUser User user) {

        log.debug("DELETE /api/notifications/read - Username: {}",
                user.getUsername());

        int count = notificationService.eliminaNotificheLette(user.getId());

        return ResponseEntity.ok(Map.of("deletedCount", count));
    }

    /**
     * DELETE /api/notifications/all
     * Elimina TUTTE le notifiche dell'utente (lette e non lette).
     * <p>
     * Funzionalità di pulizia totale delle notifiche.
     * Utile quando l'utente vuole fare piazza pulita.
     * <p>
     * Restituisce il numero di notifiche eliminate nella risposta.
     * <p>
     * Codici di stato:
     * - 200 OK: Notifiche eliminate con successo
     * - 401 UNAUTHORIZED: Utente non autenticato
     *
     * @param user Utente autenticato
     * @return Map con il campo deletedCount (numero di notifiche eliminate)
     */
    @DeleteMapping("/all")
    public ResponseEntity<Map<String, Integer>> eliminaTutteLeNotifiche(
            @CurrentUser User user) {

        log.debug("DELETE /api/notifications/all - Username: {}",
                user.getUsername());

        int count = notificationService.eliminaTutteLeNotifiche(user.getId());

        return ResponseEntity.ok(Map.of("deletedCount", count));
    }
}
