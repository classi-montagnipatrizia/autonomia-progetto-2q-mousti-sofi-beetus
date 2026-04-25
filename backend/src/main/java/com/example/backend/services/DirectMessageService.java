package com.example.backend.services;

import com.example.backend.dtos.request.InviaMessaggioRequestDTO;
import com.example.backend.dtos.response.ConversationResponseDTO;
import com.example.backend.dtos.response.MessageResponseDTO;
import com.example.backend.exception.InvalidInputException;
import com.example.backend.exception.ResourceNotFoundException;
import com.example.backend.util.SearchUtils;
import com.example.backend.exception.UnauthorizedException;
import com.example.backend.mappers.MessageMapper;
import com.example.backend.models.DirectMessage;
import com.example.backend.models.HiddenMessage;
import com.example.backend.models.User;
import com.example.backend.repositories.DirectMessageRepository;
import com.example.backend.repositories.HiddenMessageRepository;
import com.example.backend.repositories.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Service
@RequiredArgsConstructor
@Slf4j
public class DirectMessageService {

    private final DirectMessageRepository messageRepository;
    private final UserRepository userRepository;
    private final MessageMapper messageMapper;
    private final NotificationService notificationService;
    private final HiddenMessageRepository hiddenMessageRepository;
    private final SimpMessagingTemplate messagingTemplate;
    private final ImageService imageService;

    private static final String ENTITY_MESSAGE = "Messaggio";
    private static final String ENTITY_USER = "Utente";
    private static final String FIELD_ID = "id";

    /**
     * Invia un messaggio diretto a un altro utente.
     * I messaggi possono essere inviati solo tra compagni della stessa classe.
     */
    @Transactional
    public MessageResponseDTO inviaMessaggio(Long senderId, InviaMessaggioRequestDTO request) {
        log.info("Invio messaggio - Da utente: {} a utente: {}", senderId, request.getDestinatarioId());

        // Verifica che non stia mandando messaggi a se stesso
        if (senderId.equals(request.getDestinatarioId())) {
            throw new InvalidInputException("Non puoi inviare messaggi a te stesso");
        }

        // Verifica che il messaggio abbia contenuto valido
        if (!request.isValid()) {
            throw new InvalidInputException("Il messaggio deve contenere almeno un testo, un'immagine o un audio");
        }

        // Validazione audio: non combinabile con testo/immagine, max 120 secondi
        if (request.isAudioMessage()) {
            if ((request.getContenuto() != null && !request.getContenuto().isBlank())
                    || (request.getImageUrl() != null && !request.getImageUrl().isBlank())) {
                throw new InvalidInputException("Un messaggio audio non può contenere testo o immagini");
            }
            if (request.getAudioDuration() == null) {
                throw new InvalidInputException("La durata dell'audio è obbligatoria");
            }
            if (request.getAudioDuration() > 120) {
                throw new InvalidInputException("I messaggi vocali non possono superare 2 minuti");
            }
        }

        // Carica mittente e destinatario
        User sender = userRepository.findById(senderId)
                .orElseThrow(() -> new ResourceNotFoundException(ENTITY_USER, FIELD_ID, senderId));

        User receiver = userRepository.findById(request.getDestinatarioId())
                .orElseThrow(() -> new ResourceNotFoundException(
                        ENTITY_USER, FIELD_ID, request.getDestinatarioId()));

        // Verifica che mittente e destinatario siano della stessa classe.
        // Se entrambi hanno una classe assegnata, devono coincidere.
        // Se uno dei due ha classroom null il sistema di isolamento non è configurato: blocca
        // il messaggio per evitare che un utente senza classe possa raggiungere chiunque.
        String senderClassroom = sender.getClassroom();
        String receiverClassroom = receiver.getClassroom();

        boolean senderHasClassroom = senderClassroom != null && !senderClassroom.isEmpty();
        boolean receiverHasClassroom = receiverClassroom != null && !receiverClassroom.isEmpty();

        if (senderHasClassroom != receiverHasClassroom
                || (senderHasClassroom && !senderClassroom.equals(receiverClassroom))) {
            log.warn("Tentativo di inviare messaggio a utente di altra classe - Mittente: {} ({}), Destinatario: {} ({})",
                    senderId, senderClassroom, request.getDestinatarioId(), receiverClassroom);
            throw new InvalidInputException("Puoi inviare messaggi solo ai compagni della tua classe");
        }

        // Crea il messaggio
        DirectMessage message = DirectMessage.builder()
                .sender(sender)
                .receiver(receiver)
                .content(request.isAudioMessage() ? null : (request.getContenuto() != null ? request.getContenuto() : ""))
                .imageUrl(request.isAudioMessage() ? null : request.getImageUrl())
                .audioUrl(request.getAudioUrl())
                .audioDuration(request.getAudioDuration())
                .isRead(false)
                .isDeletedBySender(false)
                .isDeletedByReceiver(false)
                .isDeletedPermanently(false)
                .build();

        message = messageRepository.save(message);
        log.info("Messaggio inviato - ID: {}, hasImage: {}, hasAudio: {}",
                message.getId(), request.getImageUrl() != null, request.getAudioUrl() != null);

        MessageResponseDTO response = messageMapper.toMessaggioResponseDTO(message);

        // Invia messaggio real-time via WebSocket al destinatario
        try {
            messagingTemplate.convertAndSendToUser(
                receiver.getUsername(),
                "/queue/messages",
                response
            );
            log.debug("Messaggio WebSocket inviato a utente: {}", receiver.getUsername());
        } catch (Exception e) {
            // Non blocca l'invio se WebSocket fallisce (utente offline)
            log.warn("Impossibile inviare messaggio WebSocket a {}: {}", receiver.getUsername(), e.getMessage());
        }

        // Crea notifica per il destinatario
        notificationService.creaNotificaMessaggio(receiver.getId(), sender.getId(), message.getId());

        return response;
    }

    /**
     * Ottiene la conversazione tra due utenti
     */
    @Transactional(readOnly = true)
    public List<MessageResponseDTO> ottieniConversazione(Long userId, Long altroUtenteId) {
        log.debug("Caricamento conversazione tra utente {} e utente {}", userId, altroUtenteId);

        if (!userRepository.existsById(userId)) {
            throw new ResourceNotFoundException(ENTITY_USER, FIELD_ID, userId);
        }
        if (!userRepository.existsById(altroUtenteId)) {
            throw new ResourceNotFoundException(ENTITY_USER, FIELD_ID, altroUtenteId);
        }

        List<DirectMessage> messages = messageRepository.findConversationWithUsers(userId, altroUtenteId);

        log.debug("Trovati {} messaggi nella conversazione", messages.size());

        if (messages.isEmpty()) {
            return List.of();
        }

        List<Long> messageIds = messages.stream().map(DirectMessage::getId).toList();
        Set<Long> hiddenIds = new HashSet<>(hiddenMessageRepository.findHiddenMessageIds(userId, messageIds));

        return messages.stream()
                .map(message -> messageMapper.toMessaggioResponseDTO(message, hiddenIds.contains(message.getId())))
                .toList();
    }

    /**
     * Ottiene tutte le conversazioni dell'utente con preview ultimo messaggio
     */
    @Transactional(readOnly = true)
    public Page<ConversationResponseDTO> ottieniConversazioni(Long userId, Pageable pageable) {
        log.debug("Caricamento conversazioni per utente {}", userId);

        Page<DirectMessage> lastMessages = messageRepository.findLatestConversations(userId, pageable);

        if (lastMessages.isEmpty()) {
            return lastMessages.map(m -> null);
        }

        List<Long> otherUserIds = lastMessages.stream()
                .map(m -> m.getSender().getId().equals(userId) ? m.getReceiver().getId() : m.getSender().getId())
                .toList();

        java.util.Map<Long, Long> unreadMap = new java.util.HashMap<>();
        for (Object[] row : messageRepository.countUnreadMessagesBySenders(userId, otherUserIds)) {
            unreadMap.put((Long) row[0], (Long) row[1]);
        }

        List<Long> messageIds = lastMessages.stream().map(DirectMessage::getId).toList();
        Set<Long> hiddenIds = new HashSet<>(hiddenMessageRepository.findHiddenMessageIds(userId, messageIds));

        return lastMessages.map(lastMessage -> {
            User altroUtente = lastMessage.getSender().getId().equals(userId)
                    ? lastMessage.getReceiver()
                    : lastMessage.getSender();

            int unreadCount = unreadMap.getOrDefault(altroUtente.getId(), 0L).intValue();
            boolean isLastMessageHidden = hiddenIds.contains(lastMessage.getId());

            return messageMapper.toConversazioneResponseDTO(
                    altroUtente, lastMessage, unreadCount, isLastMessageHidden);
        });
    }

    /**
     * Marca tutti i messaggi di una conversazione come letti
     */
    @Transactional
    public void marcaMessaggiComeLetti(Long receiverId, Long senderId) {
        log.debug("Marca messaggi come letti - Ricevente: {}, Mittente: {}", receiverId, senderId);

        messageRepository.markMessagesAsRead(receiverId, senderId);

        log.info("Messaggi marcati come letti");
    }

    /**
     * Conta tutti i messaggi non letti dell'utente
     */
    @Transactional(readOnly = true)
    public long contaMessaggiNonLetti(Long userId) {
        return messageRepository.countUnreadMessages(userId);
    }

    /**
     * Conta messaggi non letti da un utente specifico
     */
    @Transactional(readOnly = true)
    public long contaMessaggiNonLettiDaUtente(Long receiverId, Long senderId) {
        return messageRepository.countUnreadMessagesBySender(receiverId, senderId);
    }

    /**
     * Elimina un messaggio.
     * - Se è un messaggio proprio (sender): soft delete (isDeletedBySender = true), tutti vedono "Messaggio cancellato"
     * - Se è un messaggio altrui: nascondimento (HiddenMessage), solo tu non lo vedi più
     */
    @Transactional
    public void eliminaMessaggio(Long messageId, Long userId) {
        log.info("Eliminazione messaggio {} da utente {}", messageId, userId);

        DirectMessage message = messageRepository.findById(messageId)
                .orElseThrow(() -> new ResourceNotFoundException(ENTITY_MESSAGE, FIELD_ID, messageId));

        // Verifica che l'utente sia coinvolto nel messaggio
        if (!message.getSender().getId().equals(userId)
                && !message.getReceiver().getId().equals(userId)) {
            throw new UnauthorizedException("Non hai i permessi per eliminare questo messaggio");
        }

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException(ENTITY_USER, FIELD_ID, userId));

        // Se è il mittente -> SOFT DELETE (tutti vedranno "Messaggio cancellato")
        if (message.getSender().getId().equals(userId)) {
            // Elimina immagine da Cloudinary se presente
            if (message.getImageUrl() != null && !message.getImageUrl().isBlank()) {
                imageService.deleteMessageImage(message.getImageUrl());
                message.setImageUrl(null);
            }
            // Elimina audio da Cloudinary se presente
            if (message.getAudioUrl() != null && !message.getAudioUrl().isBlank()) {
                imageService.deleteMessageImage(message.getAudioUrl());
                message.setAudioUrl(null);
                message.setAudioDuration(null);
            }
            message.setDeletedBySender(true);
            messageRepository.save(message);
            log.info("Messaggio {} eliminato (soft delete) dal mittente", messageId);
        } else {
            // Se è il destinatario -> HIDE (solo lui non lo vede più)
            // Verifica se già nascosto
            if (!hiddenMessageRepository.existsByMessageIdAndUserId(messageId, userId)) {
                HiddenMessage hiddenMessage = HiddenMessage.builder()
                        .message(message)
                        .user(user)
                        .build();
                hiddenMessageRepository.save(hiddenMessage);
                log.info("Messaggio {} nascosto per utente {}", messageId, userId);
            } else {
                log.info("Messaggio {} già nascosto per utente {}", messageId, userId);
            }
        }
    }

    /**
     * Elimina intera conversazione con un utente.
     * - Messaggi propri: soft delete
     * - Messaggi altrui: nascondimento
     */
    @Transactional
    public int eliminaConversazione(Long userId, Long altroUtenteId) {
        log.info("Eliminazione conversazione tra utente {} e utente {}", userId, altroUtenteId);

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException(ENTITY_USER, FIELD_ID, userId));

        // Usa la query ottimizzata che carica tutti i messaggi senza filtri
        List<DirectMessage> messages = messageRepository
                .findAllConversationMessages(userId, altroUtenteId);

        // Lista per batch save dei HiddenMessages
        List<HiddenMessage> hiddenMessagesToSave = new java.util.ArrayList<>();

        int count = 0;
        for (DirectMessage message : messages) {
            // Se è il mittente -> soft delete + cleanup Cloudinary
            if (message.getSender().getId().equals(userId)) {
                if (message.getImageUrl() != null) imageService.deleteMessageImage(message.getImageUrl());
                if (message.getAudioUrl() != null) imageService.deleteMessageImage(message.getAudioUrl());
                message.setDeletedBySender(true);
            } else {
                // Se è il destinatario -> hide (se non già nascosto)
                if (!hiddenMessageRepository.existsByMessageIdAndUserId(message.getId(), userId)) {
                    HiddenMessage hiddenMessage = HiddenMessage.builder()
                            .message(message)
                            .user(user)
                            .build();
                    hiddenMessagesToSave.add(hiddenMessage);
                }
            }
            count++;
        }

        // BATCH OPERATIONS: Salva tutti in un'unica operazione invece di loop individuale
        messageRepository.saveAll(messages);
        if (!hiddenMessagesToSave.isEmpty()) {
            hiddenMessageRepository.saveAll(hiddenMessagesToSave);
            log.debug("Salvati {} hidden messages in batch", hiddenMessagesToSave.size());
        }

        log.info("Eliminati/nascosti {} messaggi dalla conversazione", count);
        return count;
    }

    /**
     * Cerca messaggi per contenuto
     */
    @Transactional(readOnly = true)
    public List<MessageResponseDTO> cercaMessaggi(Long userId, String searchTerm) {
        log.debug("Ricerca messaggi per utente {} - Termine: {}", userId, searchTerm);

        if (searchTerm == null || searchTerm.trim().isEmpty()) {
            throw new InvalidInputException("Il termine di ricerca non può essere vuoto");
        }

        String safeTerm = SearchUtils.escapeLikeWildcards(searchTerm.trim());
        List<DirectMessage> messages = messageRepository
                .searchMessagesByContent(userId, safeTerm);

        log.debug("Trovati {} messaggi con termine '{}'", messages.size(), searchTerm);

        return messages.stream()
                .map(messageMapper::toMessaggioResponseDTO)
                .toList();
    }



    /**
     * Elimina tutti i messaggi di un utente (per cancellazione account)
     */
    @Transactional
    public int eliminaTuttiMessaggiUtente(Long userId) {
        log.info("Eliminazione tutti i messaggi dell'utente {}", userId);

        // Usa query ottimizzata
        List<DirectMessage> messages = messageRepository.findAllByUserId(userId);

        // Marca tutti come eliminati permanentemente
        for (DirectMessage msg : messages) {
            msg.setDeletedPermanently(true);
        }

        messageRepository.saveAll(messages);

        log.info("Eliminati {} messaggi dell'utente {}", messages.size(), userId);
        return messages.size();
    }

    /**
     * Pulisce messaggi eliminati permanentemente (scheduled job)
     */
    @Transactional
    public void pulisciMessaggiEliminatiPermanentemente() {
        log.info("Pulizia messaggi eliminati permanentemente");

        messageRepository.deletePermanentlyDeletedMessages();

        log.info("Messaggi eliminati permanentemente ripuliti dal database");
    }

    /**
     * Pulisce messaggi vecchi e letti (scheduled job)
     */
    @Transactional
    public int pulisciMessaggiVecchi(int giorni) {
        log.info("Pulizia messaggi più vecchi di {} giorni", giorni);

        LocalDateTime threshold = LocalDateTime.now().minusDays(giorni);
        List<DirectMessage> oldMessages = messageRepository.findOldReadMessages(threshold);

        // Marca come eliminati permanentemente
        for (DirectMessage msg : oldMessages) {
            msg.setDeletedPermanently(true);
        }

        messageRepository.saveAll(oldMessages);

        log.info("Marcati {} messaggi vecchi per eliminazione permanente", oldMessages.size());
        return oldMessages.size();
    }
}