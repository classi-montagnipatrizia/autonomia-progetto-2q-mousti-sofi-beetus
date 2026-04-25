package com.example.backend.services;

import com.example.backend.dtos.request.AggiornaStatoLibroRequestDTO;
import com.example.backend.dtos.request.CreaLibroRequestDTO;
import com.example.backend.dtos.request.ModificaLibroRequestDTO;
import com.example.backend.dtos.response.BookResponseDTO;
import com.example.backend.dtos.response.BookSummaryDTO;
import com.example.backend.exception.InvalidInputException;
import com.example.backend.exception.ResourceNotFoundException;
import com.example.backend.exception.UnauthorizedException;
import com.example.backend.util.SearchUtils;
import com.example.backend.mappers.BookMapper;
import com.example.backend.models.Book;
import com.example.backend.models.BookCondition;
import com.example.backend.models.BookStatus;
import com.example.backend.models.User;
import com.example.backend.repositories.BookConversationRepository;
import com.example.backend.repositories.BookMessageRepository;
import com.example.backend.repositories.BookRepository;
import com.example.backend.repositories.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class BookService {

    private final BookRepository bookRepository;
    private final BookConversationRepository bookConversationRepository;
    private final BookMessageRepository bookMessageRepository;
    private final UserRepository userRepository;
    private final BookMapper bookMapper;
    private final ImageService imageService;

    @Transactional
    public BookResponseDTO creaLibro(Long userId, CreaLibroRequestDTO request) {
        log.info("Creazione nuovo annuncio libro per utente ID: {}", userId);

        User seller = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Utente", "id", userId));

        Book book = Book.builder()
                .title(request.getTitolo())
                .author(request.getAutore())
                .isbn(request.getIsbn())
                .description(request.getDescrizione())
                .price(request.getPrezzo())
                .condition(request.getCondizione())
                .status(BookStatus.DISPONIBILE)
                .schoolYear(request.getAnnoScolastico())
                .subject(request.getMateria())
                .frontImageUrl(request.getFrontImageUrl())
                .backImageUrl(request.getBackImageUrl())
                .seller(seller)
                .build();

        book = bookRepository.save(book);
        log.info("Libro creato con successo - ID: {} da utente: {}", book.getId(), seller.getUsername());

        return bookMapper.toBookResponseDTO(book);
    }

    @Transactional(readOnly = true)
    public Page<BookSummaryDTO> getLibriDisponibili(Long userId, Pageable pageable) {
        log.debug("Caricamento libri disponibili per utente ID: {}", userId);
        Page<Book> books = bookRepository.findAvailableBooksExcludingSeller(userId, pageable);
        return books.map(bookMapper::toBookSummaryDTO);
    }

    @Transactional(readOnly = true)
    public Page<BookSummaryDTO> cercaLibri(Long userId, String searchTerm, String schoolYear,
                                           String subject, String condition, BigDecimal maxPrice,
                                           Pageable pageable) {
        log.debug("Ricerca libri - termine: '{}', anno: '{}', materia: '{}', condizione: '{}', prezzo max: {}",
                searchTerm, schoolYear, subject, condition, maxPrice);

        BookCondition conditionEnum = null;
        if (condition != null && !condition.isBlank()) {
            try {
                conditionEnum = BookCondition.valueOf(condition.trim().toUpperCase());
            } catch (IllegalArgumentException e) {
                log.warn("Valore condizione non valido ignorato: '{}'", condition);
            }
        }

        String safeTerm = searchTerm != null ? SearchUtils.escapeLikeWildcards(searchTerm.trim()) : null;
        Page<Book> books = bookRepository.searchBooks(userId, safeTerm, schoolYear, subject,
                conditionEnum, maxPrice, pageable);
        return books.map(bookMapper::toBookSummaryDTO);
    }

    @Transactional(readOnly = true)
    public Page<BookResponseDTO> getMieiAnnunci(Long userId, Pageable pageable) {
        log.debug("Caricamento annunci per utente ID: {}", userId);
        Page<Book> books = bookRepository.findBySellerId(userId, pageable);
        return books.map(bookMapper::toBookResponseDTO);
    }

    @Transactional(readOnly = true)
    public BookResponseDTO getDettaglioLibro(Long bookId, Long userId) {
        log.debug("Caricamento dettaglio libro ID: {}", bookId);
        Book book = bookRepository.findByIdWithDetails(bookId)
                .orElseThrow(() -> new ResourceNotFoundException("Libro", "id", bookId));
        return bookMapper.toBookResponseDTO(book);
    }

    @Transactional
    public BookResponseDTO modificaLibro(Long bookId, Long userId, ModificaLibroRequestDTO request) {
        log.info("Modifica libro ID: {} da utente ID: {}", bookId, userId);

        Book book = bookRepository.findByIdWithDetails(bookId)
                .orElseThrow(() -> new ResourceNotFoundException("Libro", "id", bookId));

        if (!book.getSeller().getId().equals(userId)) {
            throw new UnauthorizedException("Non hai i permessi per modificare questo annuncio");
        }

        if (book.getStatus() == BookStatus.VENDUTO) {
            throw new InvalidInputException("Non puoi modificare un libro già venduto");
        }

        if (request.getTitolo() != null) book.setTitle(request.getTitolo());
        if (request.getAutore() != null) book.setAuthor(request.getAutore());
        if (request.getIsbn() != null) book.setIsbn(request.getIsbn());
        if (request.getDescrizione() != null) book.setDescription(request.getDescrizione());
        if (request.getPrezzo() != null) book.setPrice(request.getPrezzo());
        if (request.getCondizione() != null) book.setCondition(request.getCondizione());
        if (request.getAnnoScolastico() != null) book.setSchoolYear(request.getAnnoScolastico());
        if (request.getMateria() != null) book.setSubject(request.getMateria());
        if (request.getFrontImageUrl() != null) book.setFrontImageUrl(request.getFrontImageUrl());
        if (request.getBackImageUrl() != null) book.setBackImageUrl(request.getBackImageUrl());

        book = bookRepository.save(book);
        log.info("Libro modificato con successo - ID: {}", bookId);

        return bookMapper.toBookResponseDTO(book);
    }

    @Transactional(readOnly = true)
    public boolean isImageLinkedToAnyBook(String url) {
        return bookRepository.existsByFrontImageUrlOrBackImageUrl(url, url);
    }

    @Transactional
    public void eliminaLibro(Long bookId, Long userId) {
        log.info("Eliminazione libro ID: {} da utente ID: {}", bookId, userId);

        Book book = bookRepository.findByIdWithDetails(bookId)
                .orElseThrow(() -> new ResourceNotFoundException("Libro", "id", bookId));

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Utente", "id", userId));

        boolean isSeller = book.getSeller().getId().equals(userId);
        boolean isAdmin = user.getIsAdmin();

        if (!isSeller && !isAdmin) {
            throw new UnauthorizedException("Non hai i permessi per eliminare questo annuncio");
        }

        deleteBookImage(book.getFrontImageUrl());
        deleteBookImage(book.getBackImageUrl());

        // Elimina messaggi e conversazioni collegate prima di eliminare il libro
        List<Long> convIds = bookConversationRepository.findIdsByBookId(bookId);
        for (Long convId : convIds) {
            bookMessageRepository.deleteByConversationId(convId);
        }
        bookConversationRepository.deleteAllById(convIds);

        bookRepository.delete(book);
        log.info("Libro eliminato con successo - ID: {}", bookId);
    }

    @Transactional
    public BookResponseDTO aggiornaStato(Long bookId, Long userId, AggiornaStatoLibroRequestDTO request) {
        log.info("Aggiornamento stato libro ID: {} a {} da utente ID: {}", bookId, request.getStato(), userId);

        Book book = bookRepository.findByIdWithDetails(bookId)
                .orElseThrow(() -> new ResourceNotFoundException("Libro", "id", bookId));

        if (!book.getSeller().getId().equals(userId)) {
            throw new UnauthorizedException("Solo il venditore può cambiare lo stato del libro");
        }

        BookStatus oldStatus = book.getStatus();
        BookStatus newStatus = request.getStato();

        validateStatusTransition(oldStatus, newStatus);

        book.setStatus(newStatus);
        book = bookRepository.save(book);
        log.info("Stato libro aggiornato - ID: {}, {} -> {}", bookId, oldStatus, newStatus);

        return bookMapper.toBookResponseDTO(book);
    }

    private void validateStatusTransition(BookStatus from, BookStatus to) {
        if (from == to) {
            throw new InvalidInputException("Il libro è già nello stato " + to);
        }

        boolean valid = switch (from) {
            case DISPONIBILE -> to == BookStatus.VENDUTO;
            case VENDUTO -> to == BookStatus.DISPONIBILE;
        };

        if (!valid) {
            throw new InvalidInputException(
                    String.format("Transizione di stato non valida: %s -> %s", from, to));
        }
    }

    private void deleteBookImage(String imageUrl) {
        if (imageUrl == null || imageUrl.isBlank()) return;
        try {
            imageService.deleteMessageImage(imageUrl);
        } catch (Exception e) {
            log.warn("Impossibile eliminare immagine libro da Cloudinary: {}", e.getMessage());
        }
    }
}
