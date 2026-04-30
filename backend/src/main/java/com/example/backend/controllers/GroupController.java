package com.example.backend.controllers;

import com.example.backend.config.CurrentUser;
import com.example.backend.dtos.request.CreaGruppoRequestDTO;
import com.example.backend.dtos.request.InviaMessaggioGruppoRequestDTO;
import com.example.backend.dtos.request.ModificaGruppoRequestDTO;
import com.example.backend.dtos.response.GroupMessageDTO;
import com.example.backend.dtos.response.GroupResponseDTO;
import com.example.backend.dtos.response.GroupSummaryDTO;
import com.example.backend.models.User;
import com.example.backend.services.GroupService;
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
@RequestMapping("/api/groups")
@RequiredArgsConstructor
@Slf4j
public class GroupController {

    private final GroupService groupService;

    // ── CRUD GRUPPO ──────────────────────────────────────────────────────────

    @PostMapping
    public ResponseEntity<GroupResponseDTO> creaGruppo(
            @Valid @RequestBody CreaGruppoRequestDTO request,
            @CurrentUser User user) {
        log.debug("POST /api/groups - Username: {}", user.getUsername());
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(groupService.creaGruppo(user.getId(), request));
    }

    @GetMapping("/miei")
    public ResponseEntity<List<GroupSummaryDTO>> getMieiGruppi(@CurrentUser User user) {
        log.debug("GET /api/groups/miei - Username: {}", user.getUsername());
        return ResponseEntity.ok(groupService.getMieiGruppi(user.getId()));
    }

    @GetMapping("/{groupId}")
    public ResponseEntity<GroupResponseDTO> getDettaglioGruppo(
            @PathVariable Long groupId,
            @CurrentUser User user) {
        log.debug("GET /api/groups/{} - Username: {}", groupId, user.getUsername());
        return ResponseEntity.ok(groupService.getDettaglioGruppo(groupId, user.getId()));
    }

    @PutMapping("/{groupId}")
    public ResponseEntity<GroupResponseDTO> modificaGruppo(
            @PathVariable Long groupId,
            @Valid @RequestBody ModificaGruppoRequestDTO request,
            @CurrentUser User user) {
        log.debug("PUT /api/groups/{} - Username: {}", groupId, user.getUsername());
        return ResponseEntity.ok(groupService.modificaGruppo(groupId, user.getId(), request));
    }

    @DeleteMapping("/{groupId}")
    public ResponseEntity<Void> eliminaGruppo(
            @PathVariable Long groupId,
            @CurrentUser User user) {
        log.debug("DELETE /api/groups/{} - Username: {}", groupId, user.getUsername());
        groupService.eliminaGruppo(groupId, user.getId());
        return ResponseEntity.noContent().build();
    }

    // ── GESTIONE MEMBRI ───────────────────────────────────────────────────────

    @PostMapping("/{groupId}/members/{targetUserId}")
    public ResponseEntity<GroupResponseDTO> aggiungiMembro(
            @PathVariable Long groupId,
            @PathVariable Long targetUserId,
            @CurrentUser User user) {
        log.debug("POST /api/groups/{}/members/{} - Username: {}", groupId, targetUserId, user.getUsername());
        return ResponseEntity.ok(groupService.aggiungiMembro(groupId, user.getId(), targetUserId));
    }

    @DeleteMapping("/{groupId}/members/{targetUserId}")
    public ResponseEntity<GroupResponseDTO> rimuoviMembro(
            @PathVariable Long groupId,
            @PathVariable Long targetUserId,
            @CurrentUser User user) {
        log.debug("DELETE /api/groups/{}/members/{} - Username: {}", groupId, targetUserId, user.getUsername());
        return ResponseEntity.ok(groupService.rimuoviMembro(groupId, user.getId(), targetUserId));
    }

    @DeleteMapping("/{groupId}/leave")
    public ResponseEntity<Void> abbandonaGruppo(
            @PathVariable Long groupId,
            @CurrentUser User user) {
        log.debug("DELETE /api/groups/{}/leave - Username: {}", groupId, user.getUsername());
        groupService.abbandonaGruppo(groupId, user.getId());
        return ResponseEntity.noContent().build();
    }

    // ── MESSAGGI ─────────────────────────────────────────────────────────────

    @GetMapping("/{groupId}/messages")
    public ResponseEntity<Page<GroupMessageDTO>> getMessaggi(
            @PathVariable Long groupId,
            @PageableDefault(size = 30, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable,
            @CurrentUser User user) {
        log.debug("GET /api/groups/{}/messages - Username: {}", groupId, user.getUsername());
        return ResponseEntity.ok(groupService.getMessaggi(groupId, user.getId(), pageable));
    }

    @GetMapping("/messages/search")
    public ResponseEntity<List<GroupMessageDTO>> searchMessagesGlobal(
            @RequestParam String q,
            @CurrentUser User user) {
        log.debug("GET /api/groups/messages/search?q={} - Username: {}", q, user.getUsername());
        return ResponseEntity.ok(groupService.searchMessagesGlobal(user.getId(), q));
    }

    @GetMapping("/{groupId}/messages/search")
    public ResponseEntity<Page<GroupMessageDTO>> searchMessages(
            @PathVariable Long groupId,
            @RequestParam String q,
            @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable,
            @CurrentUser User user) {
        log.debug("GET /api/groups/{}/messages/search?q={} - Username: {}", groupId, q, user.getUsername());
        return ResponseEntity.ok(groupService.searchMessages(groupId, user.getId(), q, pageable));
    }

    @PostMapping("/{groupId}/messages")
    public ResponseEntity<GroupMessageDTO> inviaMessaggio(
            @PathVariable Long groupId,
            @Valid @RequestBody InviaMessaggioGruppoRequestDTO request,
            @CurrentUser User user) {
        log.debug("POST /api/groups/{}/messages - Username: {}", groupId, user.getUsername());
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(groupService.inviaMessaggio(groupId, user.getId(), request));
    }

    @DeleteMapping("/{groupId}/messages/{messageId}")
    public ResponseEntity<Void> eliminaMessaggio(
            @PathVariable Long groupId,
            @PathVariable Long messageId,
            @CurrentUser User user) {
        log.debug("DELETE /api/groups/{}/messages/{} - Username: {}", groupId, messageId, user.getUsername());
        groupService.eliminaMessaggio(groupId, messageId, user.getId());
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/{groupId}/read")
    public ResponseEntity<Void> segnaLetto(
            @PathVariable Long groupId,
            @CurrentUser User user) {
        log.debug("PATCH /api/groups/{}/read - Username: {}", groupId, user.getUsername());
        groupService.segnaLetto(groupId, user.getId());
        return ResponseEntity.noContent().build();
    }

    // ── TYPING INDICATORS ────────────────────────────────────────────────────

    @PostMapping("/{groupId}/typing")
    public ResponseEntity<Void> setTyping(
            @PathVariable Long groupId,
            @CurrentUser User user) {
        log.debug("POST /api/groups/{}/typing - Username: {}", groupId, user.getUsername());
        groupService.setGroupTyping(groupId, user.getId(), user.getUsername());
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/{groupId}/typing")
    public ResponseEntity<Void> clearTyping(
            @PathVariable Long groupId,
            @CurrentUser User user) {
        log.debug("DELETE /api/groups/{}/typing - Username: {}", groupId, user.getUsername());
        groupService.clearGroupTyping(groupId, user.getId(), user.getUsername());
        return ResponseEntity.ok().build();
    }
}
