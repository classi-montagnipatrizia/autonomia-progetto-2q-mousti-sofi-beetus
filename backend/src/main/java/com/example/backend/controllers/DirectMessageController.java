package com.example.backend.controllers;

import com.example.backend.config.CurrentUser;
import com.example.backend.dtos.request.InviaMessaggioRequestDTO;
import com.example.backend.dtos.response.ConversationResponseDTO;
import com.example.backend.dtos.response.MessageResponseDTO;
import com.example.backend.models.User;
import com.example.backend.services.DirectMessageService;
import com.example.backend.services.TypingIndicatorService;
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
import java.util.Map;

/**
 * Controller per la gestione dei messaggi diretti tra utenti.
 * <p>
 * Espone API RESTful per tutte le operazioni di messaggistica privata:
 * - Invio e ricezione messaggi
 * - Visualizzazione conversazioni e cronologia
 * - Marcatura messaggi come letti
 * - Eliminazione messaggi e conversazioni
 * - Conteggio messaggi non letti
 * - Ricerca messaggi per contenuto
 */
@RestController
@RequestMapping("/api/messages")
@RequiredArgsConstructor
@Slf4j
public class DirectMessageController {

    private final DirectMessageService messageService;
    private final TypingIndicatorService typingIndicatorService;

    /**
     * POST /api/messages
     * Invia un nuovo messaggio diretto a un altro utente.
     * <p>
     * Crea un nuovo messaggio nella conversazione con l'utente specificato.
     * Il destinatario riceverà una notifica del nuovo messaggio.
     * <p>
     * Codici di stato:
     * - 201 CREATED: Messaggio inviato con successo
     * - 400 BAD REQUEST: Validazione fallita o tentativo di mandare messaggi a se stesso
     * - 401 UNAUTHORIZED: Utente non autenticato
     * - 404 NOT FOUND: Destinatario non trovato
     *
     * @param request     DTO con l'ID del destinatario e il contenuto del messaggio
     * @param userDetails Dettagli dell'utente autenticato (iniettato automaticamente)
     * @return MessageResponseDTO con i dati del messaggio inviato
     */
    @PostMapping
    public ResponseEntity<MessageResponseDTO> inviaMessaggio(
            @Valid @RequestBody InviaMessaggioRequestDTO request,
            @CurrentUser User user) {

        log.debug("POST /api/messages - Username: {}, Destinatario: {}",
                user.getUsername(), request.getDestinatarioId());


        MessageResponseDTO message = messageService.inviaMessaggio(user.getId(), request);

        return ResponseEntity.status(HttpStatus.CREATED).body(message);
    }

    /**
     * GET /api/messages/conversations
     * Ottiene tutte le conversazioni attive con preview dell'ultimo messaggio.
     * <p>
     * Restituisce una lista paginata di conversazioni ordinate per data
     * dell'ultimo messaggio (più recenti prime). Per ogni conversazione mostra:
     * - I dati dell'altro utente
     * - L'ultimo messaggio scambiato come preview
     * - Il numero di messaggi non letti
     * <p>
     * Codici di stato:
     * - 200 OK: Lista caricata (anche se vuota)
     * - 401 UNAUTHORIZED: Utente non autenticato
     *
     * @param pageable    Parametri di paginazione (iniettati dalla query string)
     * @param userDetails Dettagli dell'utente autenticato
     * @return Page di ConversationResponseDTO con le conversazioni attive
     */
    @GetMapping("/conversations")
    public ResponseEntity<Page<ConversationResponseDTO>> ottieniConversazioni(
            @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC)
            Pageable pageable,
            @CurrentUser User user) {

        log.debug("GET /api/messages/conversations - Username: {}", user.getUsername());


        Page<ConversationResponseDTO> conversations = messageService
                .ottieniConversazioni(user.getId(), pageable);

        return ResponseEntity.ok(conversations);
    }

    /**
     * GET /api/messages/conversation/{userId}
     * Ottiene la cronologia completa della conversazione con un utente specifico.
     * <p>
     * Restituisce tutti i messaggi scambiati tra l'utente corrente e l'utente
     * specificato, ordinati cronologicamente. Include sia messaggi inviati che ricevuti.
     * <p>
     * Codici di stato:
     * - 200 OK: Cronologia caricata (anche se vuota)
     * - 401 UNAUTHORIZED: Utente non autenticato
     * - 404 NOT FOUND: Utente specificato non trovato
     *
     * @param userId      L'ID dell'altro utente nella conversazione
     * @param userDetails Dettagli dell'utente autenticato
     * @return Lista di MessageResponseDTO con tutti i messaggi della conversazione
     */
    @GetMapping("/conversation/{userId}")
    public ResponseEntity<List<MessageResponseDTO>> ottieniConversazione(
            @PathVariable Long userId,
            @CurrentUser User user) {

        log.debug("GET /api/messages/conversation/{} - Username: {}",
                userId, user.getUsername());


        List<MessageResponseDTO> messages = messageService
                .ottieniConversazione(user.getId(), userId);

        return ResponseEntity.ok(messages);
    }

    /**
     * PUT /api/messages/conversation/{userId}/read
     * Marca tutti i messaggi di una conversazione come letti.
     * <p>
     * Viene chiamato quando l'utente apre/visualizza una conversazione.
     * Aggiorna lo stato isRead di tutti i messaggi ricevuti da quell'utente
     * che erano ancora non letti.
     * <p>
     * Codici di stato:
     * - 200 OK: Messaggi marcati come letti
     * - 401 UNAUTHORIZED: Utente non autenticato
     * - 404 NOT FOUND: Utente specificato non trovato
     *
     * @param userId      L'ID dell'utente mittente dei messaggi
     * @param userDetails Dettagli dell'utente autenticato
     * @return ResponseEntity vuoto
     */
    @PutMapping("/conversation/{userId}/read")
    public ResponseEntity<Void> marcaConversazioneComeLetta(
            @PathVariable Long userId,
            @CurrentUser User user) {

        log.debug("PUT /api/messages/conversation/{}/read - Username: {}",
                userId, user.getUsername());


        messageService.marcaMessaggiComeLetti(user.getId(), userId);

        return ResponseEntity.ok().build();
    }

    /**
     * GET /api/messages/unread/count
     * Conta tutti i messaggi non letti dell'utente.
     * <p>
     * Restituisce il numero totale di messaggi ricevuti che non sono
     * ancora stati letti dall'utente corrente.
     * <p>
     * Codici di stato:
     * - 200 OK: Conteggio restituito con successo
     * - 401 UNAUTHORIZED: Utente non autenticato
     *
     * @param userDetails Dettagli dell'utente autenticato
     * @return Map con il campo unreadCount (long)
     */
    @GetMapping("/unread/count")
    public ResponseEntity<Map<String, Long>> contaMessaggiNonLetti(
            @CurrentUser User user) {

        log.debug("GET /api/messages/unread/count - Username: {}", user.getUsername());


        long count = messageService.contaMessaggiNonLetti(user.getId());

        return ResponseEntity.ok(Map.of("unreadCount", count));
    }

    /**
     * GET /api/messages/conversation/{userId}/unread/count
     * Conta i messaggi non letti da un utente specifico.
     * <p>
     * Restituisce quanti messaggi non letti provengono dall'utente specificato.
     * Utile per mostrare un badge specifico per ogni conversazione nella
     * lista delle conversazioni.
     * <p>
     * Codici di stato:
     * - 200 OK: Conteggio restituito con successo
     * - 401 UNAUTHORIZED: Utente non autenticato
     * - 404 NOT FOUND: Utente specificato non trovato
     *
     * @param userId      L'ID dell'utente mittente
     * @param userDetails Dettagli dell'utente autenticato
     * @return Map con il campo unreadCount (long)
     */
    @GetMapping("/conversation/{userId}/unread/count")
    public ResponseEntity<Map<String, Long>> contaMessaggiNonLettiDaUtente(
            @PathVariable Long userId,
            @CurrentUser User user) {

        log.debug("GET /api/messages/conversation/{}/unread/count - Username: {}",
                userId, user.getUsername());


        long count = messageService.contaMessaggiNonLettiDaUtente(user.getId(), userId);

        return ResponseEntity.ok(Map.of("unreadCount", count));
    }

    /**
     * DELETE /api/messages/{messageId}
     * Elimina un singolo messaggio (soft delete).
     * <p>
     * Il messaggio viene eliminato solo dal lato dell'utente corrente.
     * L'altro utente continuerà a visualizzarlo fino a quando anche
     * lui non lo eliminerà.
     * <p>
     * Solo quando entrambi gli utenti eliminano il messaggio, questo
     * viene rimosso permanentemente dal database.
     * <p>
     * <p>
     * Codici di stato:
     * - 204 NO CONTENT: Messaggio eliminato con successo
     * - 401 UNAUTHORIZED: Utente non autenticato
     * - 403 FORBIDDEN: L'utente non è coinvolto in questo messaggio
     * - 404 NOT FOUND: Messaggio non trovato
     *
     * @param messageId   L'ID del messaggio da eliminare
     * @param userDetails Dettagli dell'utente autenticato
     * @return ResponseEntity vuoto con status 204
     */
    @DeleteMapping("/{messageId}")
    public ResponseEntity<Void> eliminaMessaggio(
            @PathVariable Long messageId,
            @CurrentUser User user) {

        log.debug("DELETE /api/messages/{} - Username: {}", messageId, user.getUsername());


        messageService.eliminaMessaggio(messageId, user.getId());

        return ResponseEntity.noContent().build();
    }

    /**
     * DELETE /api/messages/conversation/{userId}
     * Elimina un'intera conversazione con un altro utente.
     * <p>
     * Elimina tutti i messaggi scambiati con l'utente specificato
     * applicando la stessa logica di soft delete dei singoli messaggi.
     * <p>
     * I messaggi rimangono visibili all'altro utente fino a quando
     * anche lui non elimina la conversazione.
     * <p>
     * Restituisce il numero di messaggi eliminati nella risposta.
     * <p>
     * Codici di stato:
     * - 200 OK: Conversazione eliminata con successo
     * - 401 UNAUTHORIZED: Utente non autenticato
     * - 404 NOT FOUND: Utente specificato non trovato
     *
     * @param userId      L'ID dell'altro utente nella conversazione
     * @param userDetails Dettagli dell'utente autenticato
     * @return Map con il campo deletedCount (numero di messaggi eliminati)
     */
    @DeleteMapping("/conversation/{userId}")
    public ResponseEntity<Map<String, Integer>> eliminaConversazione(
            @PathVariable Long userId,
            @CurrentUser User user) {

        log.debug("DELETE /api/messages/conversation/{} - Username: {}",
                userId, user.getUsername());


        int count = messageService.eliminaConversazione(user.getId(), userId);

        return ResponseEntity.ok(Map.of("deletedCount", count));
    }

    /**
     * GET /api/messages/search
     * Cerca messaggi per contenuto testuale.
     * <p>
     * Permette di cercare messaggi specifici in tutte le conversazioni
     * dell'utente in base al testo contenuto.
     * <p>
     * La ricerca è case-insensitive e trova corrispondenze parziali.
     * <p>
     * Codici di stato:
     * - 200 OK: Ricerca completata (può restituire lista vuota)
     * - 400 BAD REQUEST: Termine di ricerca vuoto
     * - 401 UNAUTHORIZED: Utente non autenticato
     *
     * @param searchTerm  Il termine da cercare nei messaggi
     * @param userDetails Dettagli dell'utente autenticato
     * @return Lista di MessageResponseDTO con i messaggi trovati
     */
    @GetMapping("/search")
    public ResponseEntity<List<MessageResponseDTO>> cercaMessaggi(
            @RequestParam("q") String searchTerm,
            @CurrentUser User user) {

        log.debug("GET /api/messages/search?q={} - Username: {}",
                searchTerm, user.getUsername());


        List<MessageResponseDTO> messages = messageService.cercaMessaggi(user.getId(), searchTerm);

        return ResponseEntity.ok(messages);
    }

    /**
     * POST /api/messages/typing/{userId}
     * Segnala che l'utente sta scrivendo a un altro utente.
     * <p>
     * Il typing indicator scade automaticamente dopo 3 secondi,
     * quindi il client deve chiamare questo endpoint ripetutamente
     * mentre l'utente sta digitando.
     * <p>
     * Codici di stato:
     * - 200 OK: Typing segnalato con successo
     * - 401 UNAUTHORIZED: Utente non autenticato
     *
     * @param userId L'ID dell'utente destinatario
     * @param user   Utente autenticato
     * @return ResponseEntity vuoto
     */
    @PostMapping("/typing/{userId}")
    public ResponseEntity<Void> setTyping(
            @PathVariable Long userId,
            @CurrentUser User user) {

        log.debug("POST /api/messages/typing/{} - Username: {}", userId, user.getUsername());

        typingIndicatorService.setTyping(user.getId(), userId);

        return ResponseEntity.ok().build();
    }

    /**
     * DELETE /api/messages/typing/{userId}
     * Segnala che l'utente ha smesso di scrivere.
     * <p>
     * Opzionale - il typing scade automaticamente dopo 3 secondi.
     * Utile per rimuovere immediatamente l'indicatore quando l'utente
     * invia il messaggio o cancella il testo.
     * <p>
     * Codici di stato:
     * - 200 OK: Typing rimosso con successo
     * - 401 UNAUTHORIZED: Utente non autenticato
     *
     * @param userId L'ID dell'utente destinatario
     * @param user   Utente autenticato
     * @return ResponseEntity vuoto
     */
    @DeleteMapping("/typing/{userId}")
    public ResponseEntity<Void> clearTyping(
            @PathVariable Long userId,
            @CurrentUser User user) {

        log.debug("DELETE /api/messages/typing/{} - Username: {}", userId, user.getUsername());

        typingIndicatorService.clearTyping(user.getId(), userId);

        return ResponseEntity.ok().build();
    }

    /**
     * GET /api/messages/typing/{userId}
     * Verifica se un utente sta scrivendo.
     * <p>
     * Restituisce true se l'utente specificato sta attualmente
     * scrivendo all'utente autenticato.
     * <p>
     * Codici di stato:
     * - 200 OK: Stato typing restituito
     * - 401 UNAUTHORIZED: Utente non autenticato
     *
     * @param userId L'ID dell'utente da controllare
     * @param user   Utente autenticato
     * @return Map con il campo isTyping (boolean)
     */
    @GetMapping("/typing/{userId}")
    public ResponseEntity<Map<String, Boolean>> isTyping(
            @PathVariable Long userId,
            @CurrentUser User user) {

        log.debug("GET /api/messages/typing/{} - Username: {}", userId, user.getUsername());

        boolean isTyping = typingIndicatorService.isTyping(userId, user.getId());

        return ResponseEntity.ok(Map.of("isTyping", isTyping));
    }
}
