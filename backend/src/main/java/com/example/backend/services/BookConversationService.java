package com.example.backend.services;

import com.example.backend.dtos.response.BookConversationDTO;
import com.example.backend.dtos.response.BookMessageDTO;
import com.example.backend.dtos.response.BookSummaryDTO;
import com.example.backend.exception.InvalidInputException;
import com.example.backend.exception.ResourceNotFoundException;
import com.example.backend.exception.UnauthorizedException;
import com.example.backend.mappers.BookMapper;
import com.example.backend.mappers.UserMapper;
import com.example.backend.models.Book;
import com.example.backend.models.BookConversation;
import com.example.backend.models.BookMessage;
import com.example.backend.models.User;
import com.example.backend.repositories.BookConversationRepository;
import com.example.backend.repositories.BookMessageRepository;
import com.example.backend.repositories.BookRepository;
import com.example.backend.repositories.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Slf4j
public class BookConversationService {

    private final BookConversationRepository conversationRepository;
    private final BookMessageRepository messageRepository;
    private final BookRepository bookRepository;
    private final UserRepository userRepository;
    private final BookMapper bookMapper;
    private final UserMapper userMapper;
    private final SimpMessagingTemplate messagingTemplate;
    private final NotificationService notificationService;

    /**
     * Restituisce la conversazione esistente tra l'utente e il venditore per un dato libro.
     * Non crea nulla: la conversazione viene creata solo al primo messaggio inviato.
     * Restituisce 404 se non esiste ancora.
     */
    @Transactional(readOnly = true)
    public BookConversationDTO getMiaConversazione(Long bookId, Long userId) {
        log.debug("Ricerca conversazione per libro ID: {} da utente ID: {}", bookId, userId);

        BookConversation conversation = conversationRepository
                .findByBookIdAndBuyerId(bookId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Conversazione", "bookId", bookId));

        return toConversationDTO(conversation, userId);
    }

    /**
     * Restituisce una conversazione per ID, verificando che l'utente sia partecipante.
     * Usato dal venditore che apre una conversazione dalla lista messaggi.
     */
    @Transactional(readOnly = true)
    public BookConversationDTO getConversazioneById(Long convId, Long userId) {
        log.debug("Caricamento conversazione per ID: {} da utente ID: {}", convId, userId);

        BookConversation conversation = conversationRepository.findByIdWithDetails(convId)
                .orElseThrow(() -> new ResourceNotFoundException("Conversazione", "id", convId));

        verifyParticipant(conversation, userId);
        return toConversationDTO(conversation, userId);
    }

    /**
     * Restituisce tutte le conversazioni libreria dell'utente (come venditore o acquirente),
     * ordinate per ultima attività. Esclude le conversazioni nascoste dall'utente.
     */
    @Transactional(readOnly = true)
    public List<BookConversationDTO> getMyConversations(Long userId) {
        log.debug("Caricamento conversazioni libreria per utente ID: {}", userId);

        List<BookConversation> conversations = conversationRepository
                .findByUserIdOrderByLastMessageAtDesc(userId);

        return conversations.stream()
                .filter(conv -> !isHiddenByUser(conv, userId))
                .map(conv -> toConversationDTO(conv, userId))
                .toList();
    }

    /**
     * Restituisce i messaggi di una conversazione paginati in ordine cronologico.
     */
    @Transactional(readOnly = true)
    public Page<BookMessageDTO> getMessages(Long convId, Long userId, Pageable pageable) {
        log.debug("Caricamento messaggi conversazione ID: {} per utente ID: {}", convId, userId);

        BookConversation conversation = conversationRepository.findByIdWithDetails(convId)
                .orElseThrow(() -> new ResourceNotFoundException("Conversazione", "id", convId));

        verifyParticipant(conversation, userId);

        Page<BookMessage> messages = messageRepository.findByConversationId(convId, pageable);
        return messages.map(this::toMessageDTO);
    }

    /**
     * Invia un messaggio relativo a un libro.
     * Implementa il pattern findOrCreate: se la conversazione non esiste ancora,
     * viene creata al momento dell'invio del primo messaggio (non prima).
     * Restituisce il messaggio con il conversationId incluso, così il frontend
     * può usarlo per le chiamate successive senza dover fare un'ulteriore richiesta.
     */
    @Transactional
    public BookMessageDTO inviaMessaggio(Long bookId, Long userId, String content, Long conversationId) {
        log.info("Invio messaggio per libro ID: {} da utente ID: {}", bookId, userId);

        if (content == null || content.isBlank()) {
            throw new InvalidInputException("Il messaggio non può essere vuoto");
        }
        if (content.length() > 1000) {
            throw new InvalidInputException("Il messaggio non può superare 1000 caratteri");
        }

        Book book = bookRepository.findByIdWithDetails(bookId)
                .orElseThrow(() -> new ResourceNotFoundException("Libro", "id", bookId));

        User sender = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Utente", "id", userId));

        boolean isSeller = book.getSeller().getId().equals(userId);

        BookConversation conversation;
        if (isSeller) {
            // Il venditore può rispondere solo a conversazioni esistenti
            if (conversationId == null) {
                throw new InvalidInputException("Non puoi iniziare una conversazione sul tuo stesso libro");
            }
            conversation = conversationRepository.findByIdWithDetails(conversationId)
                    .orElseThrow(() -> new ResourceNotFoundException("Conversazione", "id", conversationId));
            verifyParticipant(conversation, userId);
        } else {
            // Acquirente: findOrCreate — crea la conversazione solo se non esiste ancora
            conversation = conversationRepository
                    .findByBookIdAndBuyerId(bookId, userId)
                    .orElseGet(() -> {
                        log.info("Prima conversazione per libro ID: {} con buyer ID: {} - creazione in corso", bookId, userId);
                        BookConversation nuova = BookConversation.builder()
                                .book(book)
                                .seller(book.getSeller())
                                .buyer(sender)
                                .build();
                        return conversationRepository.save(nuova);
                    });
        }

        // Se il destinatario aveva nascosto la conversazione, la rende visibile
        User receiver = isSeller ? conversation.getBuyer() : conversation.getSeller();
        if (isHiddenByUser(conversation, receiver.getId())) {
            unhideForUser(conversation, receiver.getId());
        }

        BookMessage message = BookMessage.builder()
                .conversation(conversation)
                .sender(sender)
                .content(content)
                .isRead(false)
                .build();

        message = messageRepository.save(message);

        conversation.setLastMessageAt(LocalDateTime.now());
        conversationRepository.save(conversation);

        BookMessageDTO dto = toMessageDTO(message);

        // Invia messaggio real-time via WebSocket al destinatario
        try {
            messagingTemplate.convertAndSendToUser(
                    receiver.getUsername(),
                    "/queue/book-messages",
                    dto
            );
            log.debug("Messaggio libro WebSocket inviato a utente: {}", receiver.getUsername());
        } catch (Exception e) {
            log.warn("Impossibile inviare messaggio libro WebSocket a {}: {}", receiver.getUsername(), e.getMessage());
        }

        // Notifica push al destinatario
        try {
            notificationService.creaNotificaMessaggioLibro(
                    receiver.getId(),
                    sender.getId(),
                    book.getId(),
                    conversation.getId(),
                    book.getTitle()
            );
        } catch (Exception e) {
            log.warn("Impossibile creare notifica BOOK_MESSAGE: {}", e.getMessage());
        }

        log.info("Messaggio inviato - ID: {} in conversazione ID: {}", message.getId(), conversation.getId());

        return dto;
    }

    /**
     * Elimina un messaggio della libreria (soft delete).
     * Solo il mittente può eliminare i propri messaggi.
     */
    @Transactional
    public void eliminaMessaggio(Long messageId, Long userId) {
        log.info("Eliminazione messaggio libro {} da utente {}", messageId, userId);

        BookMessage message = messageRepository.findById(messageId)
                .orElseThrow(() -> new ResourceNotFoundException("Messaggio", "id", messageId));

        // Solo il mittente può eliminare
        if (!message.getSender().getId().equals(userId)) {
            throw new UnauthorizedException("Puoi eliminare solo i tuoi messaggi");
        }

        message.setContent("");
        message.setDeletedBySender(true);
        messageRepository.save(message);

        log.info("Messaggio libro {} eliminato (soft delete) dal mittente", messageId);

        // Broadcast eliminazione via WebSocket al destinatario
        BookConversation conversation = conversationRepository.findByIdWithDetails(message.getConversation().getId())
                .orElse(null);
        if (conversation != null) {
            BookMessageDTO dto = toMessageDTO(message);
            User receiver = conversation.getSeller().getId().equals(userId)
                    ? conversation.getBuyer()
                    : conversation.getSeller();
            try {
                messagingTemplate.convertAndSendToUser(
                        receiver.getUsername(),
                        "/queue/book-messages",
                        dto
                );
            } catch (Exception e) {
                log.warn("Impossibile inviare broadcast eliminazione libro a {}: {}", receiver.getUsername(), e.getMessage());
            }
        }
    }

    /**
     * Nasconde una conversazione per l'utente corrente.
     * L'altro utente continua a vederla normalmente.
     */
    @Transactional
    public void nascondiConversazione(Long convId, Long userId) {
        log.info("Nascondimento conversazione {} per utente {}", convId, userId);

        BookConversation conversation = conversationRepository.findByIdWithDetails(convId)
                .orElseThrow(() -> new ResourceNotFoundException("Conversazione", "id", convId));

        verifyParticipant(conversation, userId);
        hideForUser(conversation, userId);
        conversationRepository.save(conversation);

        log.info("Conversazione {} nascosta per utente {}", convId, userId);
    }

    /**
     * Segna come letti tutti i messaggi ricevuti dall'utente in una conversazione.
     */
    @Transactional
    public void markAsRead(Long convId, Long userId) {
        log.debug("Segna come letti messaggi conversazione ID: {} per utente ID: {}", convId, userId);

        BookConversation conversation = conversationRepository.findByIdWithDetails(convId)
                .orElseThrow(() -> new ResourceNotFoundException("Conversazione", "id", convId));

        verifyParticipant(conversation, userId);

        int updated = messageRepository.markAsReadByConversationIdAndUserId(convId, userId);
        log.debug("Segnati come letti {} messaggi in conversazione ID: {}", updated, convId);
    }

    private void verifyParticipant(BookConversation conversation, Long userId) {
        boolean isSeller = conversation.getSeller().getId().equals(userId);
        boolean isBuyer = conversation.getBuyer().getId().equals(userId);
        if (!isSeller && !isBuyer) {
            throw new UnauthorizedException("Non fai parte di questa conversazione");
        }
    }

    private boolean isHiddenByUser(BookConversation conversation, Long userId) {
        if (conversation.getSeller().getId().equals(userId)) {
            return conversation.isHiddenBySeller();
        }
        return conversation.isHiddenByBuyer();
    }

    private void hideForUser(BookConversation conversation, Long userId) {
        if (conversation.getSeller().getId().equals(userId)) {
            conversation.setHiddenBySeller(true);
        } else {
            conversation.setHiddenByBuyer(true);
        }
    }

    private void unhideForUser(BookConversation conversation, Long userId) {
        if (conversation.getSeller().getId().equals(userId)) {
            conversation.setHiddenBySeller(false);
        } else {
            conversation.setHiddenByBuyer(false);
        }
    }

    private BookConversationDTO toConversationDTO(BookConversation conversation, Long currentUserId) {
        User otherUser = conversation.getSeller().getId().equals(currentUserId)
                ? conversation.getBuyer()
                : conversation.getSeller();

        BookMessage lastMessage = messageRepository.findLastByConversationId(conversation.getId());
        int unreadCount = messageRepository.countUnreadByConversationIdAndUserId(
                conversation.getId(), currentUserId);

        BookSummaryDTO bookSummary = bookMapper.toBookSummaryDTO(conversation.getBook());

        return BookConversationDTO.builder()
                .id(conversation.getId())
                .libro(bookSummary)
                .altroUtente(userMapper.toUtenteSummaryDTO(otherUser))
                .ultimoMessaggio(lastMessage != null ? toMessageDTO(lastMessage) : null)
                .messaggiNonLetti(unreadCount)
                .ultimaAttivita(conversation.getLastMessageAt())
                .createdAt(conversation.getCreatedAt())
                .build();
    }

    private BookMessageDTO toMessageDTO(BookMessage message) {
        return BookMessageDTO.builder()
                .id(message.getId())
                .conversationId(message.getConversation().getId())
                .mittente(userMapper.toUtenteSummaryDTO(message.getSender()))
                .contenuto(message.getContent())
                .isRead(message.isRead())
                .isDeletedBySender(message.isDeletedBySender())
                .createdAt(message.getCreatedAt())
                .build();
    }
}
