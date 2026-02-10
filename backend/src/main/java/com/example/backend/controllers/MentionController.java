package com.example.backend.controllers;

import com.example.backend.config.CurrentUser;
import com.example.backend.dtos.response.MentionResponseDTO;
import com.example.backend.models.User;
import com.example.backend.services.MentionService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * Controller per la gestione delle menzioni (@username).
 * <p>
 * Espone API RESTful per visualizzare le menzioni ricevute dall'utente.
 * Le menzioni possono avvenire in post, commenti o messaggi diretti.
 * <p>
 * Tutti gli endpoint richiedono autenticazione JWT.
 */
@RestController
@RequestMapping("/api/mentions")
@RequiredArgsConstructor
@Slf4j
public class MentionController {

    private final MentionService mentionService;

    /**
     * GET /api/mentions
     * Ottiene tutte le menzioni ricevute dall'utente autenticato.
     * <p>
     * Le menzioni sono ordinate dalla più recente alla più vecchia.
     * Include menzioni da post e commenti.
     * <p>
     * Codici di stato:
     * - 200 OK: Lista caricata con successo
     * - 401 UNAUTHORIZED: Utente non autenticato
     *
     * @param user Utente autenticato (iniettato automaticamente)
     * @return Lista di MentionResponseDTO
     */
    @GetMapping
    public ResponseEntity<List<MentionResponseDTO>> ottieniMenzioni(
            @CurrentUser User user) {

        log.debug("GET /api/mentions - Username: {}", user.getUsername());

        List<MentionResponseDTO> mentions = mentionService.ottieniMenzioniUtente(user.getId());

        log.info("Restituite {} menzioni per utente {}", mentions.size(), user.getUsername());
        return ResponseEntity.ok(mentions);
    }

    /**
     * GET /api/mentions/recent
     * Ottiene le ultime N menzioni ricevute dall'utente.
     * <p>
     * Utile per mostrare un'anteprima delle menzioni recenti
     * senza caricare l'intera lista.
     * <p>
     * Codici di stato:
     * - 200 OK: Lista caricata con successo
     * - 401 UNAUTHORIZED: Utente non autenticato
     *
     * @param limit Il numero massimo di menzioni da restituire (default: 10)
     * @param user  Utente autenticato (iniettato automaticamente)
     * @return Lista delle ultime N menzioni
     */
    @GetMapping("/recent")
    public ResponseEntity<List<MentionResponseDTO>> ottieniMenzioniRecenti(
            @RequestParam(defaultValue = "10") int limit,
            @CurrentUser User user) {

        log.debug("GET /api/mentions/recent?limit={} - Username: {}",
                limit, user.getUsername());

        List<MentionResponseDTO> mentions = mentionService.ottieniMenzioniRecenti(user.getId(), limit);

        log.info("Restituite {} menzioni recenti per utente {}", mentions.size(), user.getUsername());
        return ResponseEntity.ok(mentions);
    }

    /**
     * GET /api/mentions/count
     * Conta il numero totale di menzioni ricevute dall'utente.
     * <p>
     * Utile per mostrare statistiche o badge numerici.
     * <p>
     * Codici di stato:
     * - 200 OK: Conteggio restituito
     * - 401 UNAUTHORIZED: Utente non autenticato
     *
     * @param user Utente autenticato (iniettato automaticamente)
     * @return JSON con il conteggio: {"count": 42}
     */
    @GetMapping("/count")
    public ResponseEntity<Map<String, Long>> contaMenzioni(
            @CurrentUser User user) {

        log.debug("GET /api/mentions/count - Username: {}", user.getUsername());

        long count = mentionService.contaMenzioni(user.getId());

        log.info("Utente {} ha {} menzioni totali", user.getUsername(), count);
        return ResponseEntity.ok(Map.of("count", count));
    }
}
