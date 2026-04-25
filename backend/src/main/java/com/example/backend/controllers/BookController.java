package com.example.backend.controllers;

import com.example.backend.config.CurrentUser;
import com.example.backend.dtos.request.AggiornaStatoLibroRequestDTO;
import com.example.backend.dtos.request.CreaLibroRequestDTO;
import com.example.backend.dtos.request.ModificaLibroRequestDTO;
import com.example.backend.dtos.response.BookResponseDTO;
import com.example.backend.dtos.response.BookSummaryDTO;
import com.example.backend.models.User;
import com.example.backend.services.BookService;
import com.example.backend.services.ImageService;
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

import java.math.BigDecimal;
import java.util.List;

@RestController
@RequestMapping("/api/books")
@RequiredArgsConstructor
@Slf4j
public class BookController {

    private final BookService bookService;
    private final ImageService imageService;

    @PostMapping
    public ResponseEntity<BookResponseDTO> creaLibro(
            @Valid @RequestBody CreaLibroRequestDTO request,
            @CurrentUser User user) {
        log.debug("POST /api/books - Username: {}", user.getUsername());
        BookResponseDTO book = bookService.creaLibro(user.getId(), request);
        return ResponseEntity.status(HttpStatus.CREATED).body(book);
    }

    @GetMapping
    public ResponseEntity<Page<BookSummaryDTO>> getLibriDisponibili(
            @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable,
            @CurrentUser User user) {
        log.debug("GET /api/books - Username: {}", user.getUsername());
        Page<BookSummaryDTO> books = bookService.getLibriDisponibili(user.getId(), pageable);
        return ResponseEntity.ok(books);
    }

    @GetMapping("/search")
    public ResponseEntity<Page<BookSummaryDTO>> cercaLibri(
            @RequestParam(value = "q", required = false) String searchTerm,
            @RequestParam(value = "anno", required = false) String schoolYear,
            @RequestParam(value = "materia", required = false) String subject,
            @RequestParam(value = "condizione", required = false) String condition,
            @RequestParam(value = "prezzoMax", required = false) BigDecimal maxPrice,
            @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable,
            @CurrentUser User user) {
        log.debug("GET /api/books/search - Username: {}, q: {}", user.getUsername(), searchTerm);
        Page<BookSummaryDTO> books = bookService.cercaLibri(user.getId(), searchTerm, schoolYear,
                subject, condition, maxPrice, pageable);
        return ResponseEntity.ok(books);
    }

    @GetMapping("/miei")
    public ResponseEntity<Page<BookResponseDTO>> getMieiAnnunci(
            @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable,
            @CurrentUser User user) {
        log.debug("GET /api/books/miei - Username: {}", user.getUsername());
        Page<BookResponseDTO> books = bookService.getMieiAnnunci(user.getId(), pageable);
        return ResponseEntity.ok(books);
    }

    @GetMapping("/{bookId}")
    public ResponseEntity<BookResponseDTO> getDettaglioLibro(
            @PathVariable Long bookId,
            @CurrentUser User user) {
        log.debug("GET /api/books/{} - Username: {}", bookId, user.getUsername());
        BookResponseDTO book = bookService.getDettaglioLibro(bookId, user.getId());
        return ResponseEntity.ok(book);
    }

    @PutMapping("/{bookId}")
    public ResponseEntity<BookResponseDTO> modificaLibro(
            @PathVariable Long bookId,
            @Valid @RequestBody ModificaLibroRequestDTO request,
            @CurrentUser User user) {
        log.debug("PUT /api/books/{} - Username: {}", bookId, user.getUsername());
        BookResponseDTO book = bookService.modificaLibro(bookId, user.getId(), request);
        return ResponseEntity.ok(book);
    }

    @DeleteMapping("/{bookId}")
    public ResponseEntity<Void> eliminaLibro(
            @PathVariable Long bookId,
            @CurrentUser User user) {
        log.debug("DELETE /api/books/{} - Username: {}", bookId, user.getUsername());
        bookService.eliminaLibro(bookId, user.getId());
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/{bookId}/stato")
    public ResponseEntity<BookResponseDTO> aggiornaStato(
            @PathVariable Long bookId,
            @Valid @RequestBody AggiornaStatoLibroRequestDTO request,
            @CurrentUser User user) {
        log.debug("PATCH /api/books/{}/stato - Username: {}, stato: {}", bookId, user.getUsername(), request.getStato());
        BookResponseDTO book = bookService.aggiornaStato(bookId, user.getId(), request);
        return ResponseEntity.ok(book);
    }

    /**
     * DELETE /api/books/images
     * Elimina una o più immagini da Cloudinary.
     * Usato dal modal "Vendi un libro" quando l'utente clicca Annulla
     * dopo aver già caricato le foto (che non sono ancora legate a nessun Book).
     */
    @DeleteMapping("/images")
    public ResponseEntity<Void> eliminaImmagini(
            @RequestBody List<String> urls,
            @CurrentUser User user) {
        log.debug("DELETE /api/books/images - Username: {}, count: {}", user.getUsername(), urls.size());
        urls.stream()
                .filter(url -> url != null && !url.isBlank())
                // Elimina solo URL Cloudinary già non collegati a nessun libro:
                // questo endpoint serve esclusivamente per cleanup di upload pendenti (modal "Annulla").
                // URL già collegati a un libro vengono ignorati, evitando che utenti
                // eliminino immagini di altri utenti.
                .filter(url -> !bookService.isImageLinkedToAnyBook(url))
                .forEach(imageService::deleteMessageImage);
        return ResponseEntity.noContent().build();
    }
}
