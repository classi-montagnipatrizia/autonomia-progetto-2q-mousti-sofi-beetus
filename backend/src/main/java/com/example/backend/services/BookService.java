package com.example.backend.services;

import com.example.backend.dtos.request.AggiornaStatoLibroRequestDTO;
import com.example.backend.dtos.request.CreaLibroRequestDTO;
import com.example.backend.dtos.request.ModificaLibroRequestDTO;
import com.example.backend.dtos.response.BookRequestDTO;
import com.example.backend.dtos.response.BookResponseDTO;
import com.example.backend.dtos.response.BookSummaryDTO;
import com.example.backend.events.BookRequestedEvent;
import com.example.backend.exception.InvalidInputException;
import com.example.backend.exception.ResourceNotFoundException;
import com.example.backend.exception.UnauthorizedException;
import com.example.backend.mappers.BookMapper;
import com.example.backend.mappers.UserMapper;
import com.example.backend.models.Book;
import com.example.backend.models.BookRequest;
import com.example.backend.models.BookRequestStatus;
import com.example.backend.models.BookStatus;
import com.example.backend.models.User;
import com.example.backend.repositories.BookConversationRepository;
import com.example.backend.repositories.BookMessageRepository;
import com.example.backend.repositories.BookRepository;
import com.example.backend.repositories.BookRequestRepository;
import com.example.backend.repositories.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Slf4j
public class BookService {

    private final BookRepository bookRepository;
    private final BookConversationRepository bookConversationRepository;
    private final BookMessageRepository bookMessageRepository;
    private final BookRequestRepository bookRequestRepository;
    private final UserRepository userRepository;
    private final BookMapper bookMapper;
    private final UserMapper userMapper;
    private final ImageService imageService;
    private final ApplicationEventPublisher eventPublisher;

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
        return books.map(book -> {
            int richiesteCount = (int) bookRequestRepository.countPendingByBookId(book.getId());
            BookRequestStatus miaRichiesta = bookRequestRepository
                    .findByBookIdAndBuyerId(book.getId(), userId)
                    .map(BookRequest::getStatus)
                    .orElse(null);
            return bookMapper.toBookSummaryDTO(book, richiesteCount, miaRichiesta);
        });
    }

    @Transactional(readOnly = true)
    public Page<BookSummaryDTO> cercaLibri(Long userId, String searchTerm, String schoolYear,
                                           String subject, String condition, BigDecimal maxPrice,
                                           Pageable pageable) {
        log.debug("Ricerca libri - termine: '{}', anno: '{}', materia: '{}', condizione: '{}', prezzo max: {}",
                searchTerm, schoolYear, subject, condition, maxPrice);

        Page<Book> books = bookRepository.searchBooks(userId, searchTerm, schoolYear, subject,
                condition, maxPrice, pageable);
        return books.map(book -> {
            int richiesteCount = (int) bookRequestRepository.countPendingByBookId(book.getId());
            BookRequestStatus miaRichiesta = bookRequestRepository
                    .findByBookIdAndBuyerId(book.getId(), userId)
                    .map(BookRequest::getStatus)
                    .orElse(null);
            return bookMapper.toBookSummaryDTO(book, richiesteCount, miaRichiesta);
        });
    }

    @Transactional(readOnly = true)
    public Page<BookResponseDTO> getMieiAnnunci(Long userId, Pageable pageable) {
        log.debug("Caricamento annunci per utente ID: {}", userId);
        Page<Book> books = bookRepository.findBySellerId(userId, pageable);
        return books.map(book -> {
            int richiesteCount = (int) bookRequestRepository.countPendingByBookId(book.getId());
            return bookMapper.toBookResponseDTO(book, richiesteCount, null);
        });
    }

    @Transactional(readOnly = true)
    public BookResponseDTO getDettaglioLibro(Long bookId, Long userId) {
        log.debug("Caricamento dettaglio libro ID: {}", bookId);
        Book book = bookRepository.findByIdWithDetails(bookId)
                .orElseThrow(() -> new ResourceNotFoundException("Libro", "id", bookId));
        int richiesteCount = (int) bookRequestRepository.countPendingByBookId(bookId);
        BookRequestStatus miaRichiesta = bookRequestRepository
                .findByBookIdAndBuyerId(bookId, userId)
                .map(BookRequest::getStatus)
                .orElse(null);
        return bookMapper.toBookResponseDTO(book, richiesteCount, miaRichiesta);
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

        int richiesteCount = (int) bookRequestRepository.countPendingByBookId(bookId);
        return bookMapper.toBookResponseDTO(book, richiesteCount, null);
    }

    @Transactional
    public BookResponseDTO richiediLibro(Long bookId, Long userId) {
        log.info("Richiesta libro ID: {} da utente ID: {}", bookId, userId);

        Book book = bookRepository.findByIdWithDetails(bookId)
                .orElseThrow(() -> new ResourceNotFoundException("Libro", "id", bookId));

        if (book.getSeller().getId().equals(userId)) {
            throw new InvalidInputException("Non puoi richiedere il tuo stesso libro");
        }

        if (book.getStatus() == BookStatus.VENDUTO) {
            throw new InvalidInputException("Il libro è già stato venduto");
        }

        Optional<BookRequest> existingRequest = bookRequestRepository.findByBookIdAndBuyerId(bookId, userId);
        if (existingRequest.isPresent()) {
            BookRequestStatus existingStatus = existingRequest.get().getStatus();
            if (existingStatus == BookRequestStatus.PENDING || existingStatus == BookRequestStatus.ACCEPTED) {
                throw new InvalidInputException("Hai già una richiesta attiva per questo libro");
            }
        }

        User buyer = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Utente", "id", userId));

        BookRequest bookRequest = BookRequest.builder()
                .book(book)
                .buyer(buyer)
                .status(BookRequestStatus.PENDING)
                .build();
        bookRequestRepository.save(bookRequest);

        // Stato rimane DISPONIBILE: più utenti possono richiedere lo stesso libro

        log.info("Libro richiesto con successo - ID: {}, richiedente: {}", bookId, buyer.getUsername());

        eventPublisher.publishEvent(new BookRequestedEvent(bookId, userId, book.getSeller().getId()));

        int richiesteCount = (int) bookRequestRepository.countPendingByBookId(bookId);
        return bookMapper.toBookResponseDTO(book, richiesteCount, BookRequestStatus.PENDING);
    }

    @Transactional
    public BookResponseDTO annullaRichiesta(Long bookId, Long userId) {
        log.info("Annullamento richiesta libro ID: {} da utente ID: {}", bookId, userId);

        Book book = bookRepository.findByIdWithDetails(bookId)
                .orElseThrow(() -> new ResourceNotFoundException("Libro", "id", bookId));

        BookRequest bookRequest = bookRequestRepository.findByBookIdAndBuyerId(bookId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("BookRequest", "bookId+buyerId", bookId));

        if (bookRequest.getStatus() != BookRequestStatus.PENDING) {
            throw new InvalidInputException("La richiesta non è in stato PENDING e non può essere annullata");
        }

        bookRequest.setStatus(BookRequestStatus.REJECTED);
        bookRequestRepository.save(bookRequest);

        aggiornaStatoSeNessunaPending(book);

        int richiesteCount = (int) bookRequestRepository.countPendingByBookId(bookId);
        return bookMapper.toBookResponseDTO(book, richiesteCount, BookRequestStatus.REJECTED);
    }

    @Transactional(readOnly = true)
    public List<BookRequestDTO> getRichiesteLibro(Long bookId, Long userId) {
        log.debug("Caricamento richieste libro ID: {} da utente ID: {}", bookId, userId);

        Book book = bookRepository.findByIdWithDetails(bookId)
                .orElseThrow(() -> new ResourceNotFoundException("Libro", "id", bookId));

        if (!book.getSeller().getId().equals(userId)) {
            throw new UnauthorizedException("Solo il venditore può vedere le richieste del libro");
        }

        List<BookRequest> requests = bookRequestRepository.findByBookIdWithBuyer(bookId);
        return requests.stream()
                .map(br -> BookRequestDTO.builder()
                        .id(br.getId())
                        .acquirente(userMapper.toUtenteSummaryDTO(br.getBuyer()))
                        .stato(br.getStatus())
                        .createdAt(br.getCreatedAt())
                        .build())
                .toList();
    }

    @Transactional
    public BookResponseDTO accettaRichiesta(Long bookId, Long requestId, Long userId) {
        log.info("Accettazione richiesta ID: {} libro ID: {} da utente ID: {}", requestId, bookId, userId);

        Book book = bookRepository.findByIdWithDetails(bookId)
                .orElseThrow(() -> new ResourceNotFoundException("Libro", "id", bookId));

        if (!book.getSeller().getId().equals(userId)) {
            throw new UnauthorizedException("Solo il venditore può accettare le richieste");
        }

        BookRequest request = bookRequestRepository.findById(requestId)
                .orElseThrow(() -> new ResourceNotFoundException("BookRequest", "id", requestId));

        if (!request.getBook().getId().equals(bookId)) {
            throw new InvalidInputException("La richiesta non appartiene a questo libro");
        }

        if (request.getStatus() != BookRequestStatus.PENDING) {
            throw new InvalidInputException("La richiesta non è in stato PENDING");
        }

        // Accetta questa richiesta
        request.setStatus(BookRequestStatus.ACCEPTED);
        bookRequestRepository.save(request);

        // Rifiuta tutte le altre richieste PENDING per questo libro
        List<BookRequest> altreRichieste = bookRequestRepository.findPendingByBookId(bookId);
        for (BookRequest altra : altreRichieste) {
            if (!altra.getId().equals(requestId)) {
                altra.setStatus(BookRequestStatus.REJECTED);
                bookRequestRepository.save(altra);
            }
        }

        // Libro → VENDUTO
        book.setStatus(BookStatus.VENDUTO);
        book = bookRepository.save(book);

        log.info("Richiesta accettata - libro ID: {} ora VENDUTO", bookId);

        return bookMapper.toBookResponseDTO(book, 0, null);
    }

    @Transactional
    public BookResponseDTO rifiutaRichiesta(Long bookId, Long requestId, Long userId) {
        log.info("Rifiuto richiesta ID: {} libro ID: {} da utente ID: {}", requestId, bookId, userId);

        Book book = bookRepository.findByIdWithDetails(bookId)
                .orElseThrow(() -> new ResourceNotFoundException("Libro", "id", bookId));

        if (!book.getSeller().getId().equals(userId)) {
            throw new UnauthorizedException("Solo il venditore può rifiutare le richieste");
        }

        BookRequest request = bookRequestRepository.findById(requestId)
                .orElseThrow(() -> new ResourceNotFoundException("BookRequest", "id", requestId));

        if (!request.getBook().getId().equals(bookId)) {
            throw new InvalidInputException("La richiesta non appartiene a questo libro");
        }

        if (request.getStatus() != BookRequestStatus.PENDING) {
            throw new InvalidInputException("La richiesta non è in stato PENDING");
        }

        request.setStatus(BookRequestStatus.REJECTED);
        bookRequestRepository.save(request);

        aggiornaStatoSeNessunaPending(book);

        int richiesteCount = (int) bookRequestRepository.countPendingByBookId(bookId);
        return bookMapper.toBookResponseDTO(book, richiesteCount, null);
    }

    private void aggiornaStatoSeNessunaPending(Book book) {
        // Con la rimozione di RICHIESTO, non serve più aggiornare lo stato automaticamente
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
