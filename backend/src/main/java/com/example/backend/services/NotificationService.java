package com.example.backend.services;

import com.example.backend.dtos.response.NotificationResponseDTO;
import com.example.backend.events.NotificationCreatedEvent;
import com.example.backend.exception.ResourceNotFoundException;
import com.example.backend.exception.UnauthorizedException;
import com.example.backend.mappers.NotificationMapper;
import com.example.backend.models.*;
import com.example.backend.repositories.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Service per la gestione delle notifiche utente.
 * <p>
 * Gestisce tutte le operazioni relative alle notifiche:
 * - Creazione notifiche per like, commenti, menzioni e messaggi
 * - Lettura e visualizzazione notifiche
 * - Marcatura come lette/non lette
 * - Eliminazione notifiche
 * - Pulizia automatica notifiche vecchie
 * <p>

 * Include un sistema anti-spam che evita notifiche duplicate nei 5 minuti successivi.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;
    private final PostRepository postRepository;
    private final CommentRepository commentRepository;
    private final DirectMessageRepository directMessageRepository;
    private final NotificationMapper notificationMapper;
    private final ApplicationEventPublisher eventPublisher;

    private static final String ENTITY_NOTIFICATION = "Notifica";
    private static final String FIELD_ID = "id";
    private static final int DUPLICATE_CHECK_MINUTES = 5;

    /**
     * Crea una notifica quando un utente mette like a un post.
     * <p>
     * La notifica viene creata solo se:
     * - L'autore del like è diverso dall'autore del post
     * - Non esiste già una notifica duplicata negli ultimi 5 minuti
     * <p>
     * Questo evita spam di notifiche se l'utente toglie e rimette like rapidamente.
     *
     * @param receiverId       L'ID dell'autore del post (ricevente della notifica)
     * @param triggeredByUserId L'ID dell'utente che ha messo like
     * @param postId           L'ID del post che ha ricevuto il like
     */
    @Transactional
    public void creaNotificaLike(Long receiverId, Long triggeredByUserId, Long postId) {
        log.debug("Creazione notifica like - Ricevente: {}, Autore: {}, Post: {}",
                receiverId, triggeredByUserId, postId);

        // Non notificare se l'utente ha messo like al proprio post
        if (receiverId.equals(triggeredByUserId)) {
            return;
        }

        // Verifica duplicati recenti
        if (esisteNotificaDuplicata(receiverId, triggeredByUserId, NotificationType.LIKE,
                postId, "POST")) {
            log.debug("Notifica like duplicata, skip");
            return;
        }

        User receiver = userRepository.getReferenceById(receiverId);
        User triggeredBy = userRepository.getReferenceById(triggeredByUserId);
        Post post = postRepository.getReferenceById(postId);

        Notification notification = Notification.builder()
                .user(receiver)
                .type(NotificationType.LIKE)
                .triggeredByUser(triggeredBy)
                .relatedPost(post)
                .content(String.format("%s ha messo mi piace al tuo post",
                        triggeredBy.getFullName()))
                .actionUrl("/post/" + postId)
                .isRead(false)
                .build();

        notificationRepository.save(notification);
        log.info("Notifica like creata - ID: {}", notification.getId());

        // Pubblica evento per invio WebSocket asincrono
        publishNotificationEvent(receiver.getUsername(), notification);
    }

    /**
     * Crea una notifica quando un utente commenta un post.
     * <p>
     * La notifica viene inviata all'autore del post.
     * Non viene creata se l'autore del commento è anche l'autore del post.
     *
     * @param receiverId       L'ID dell'autore del post
     * @param triggeredByUserId L'ID dell'utente che ha commentato
     * @param postId           L'ID del post commentato
     * @param commentId        L'ID del commento creato
     */
    @Transactional
    public void creaNotificaCommento(Long receiverId, Long triggeredByUserId,
                                     Long postId, Long commentId) {
        log.debug("Creazione notifica commento - Ricevente: {}, Autore: {}, Post: {}",
                receiverId, triggeredByUserId, postId);

        // Non notificare se commenti il tuo stesso post
        if (receiverId.equals(triggeredByUserId)) {
            return;
        }

        // Verifica duplicati recenti
        if (esisteNotificaDuplicata(receiverId, triggeredByUserId, NotificationType.COMMENT,
                commentId, "COMMENT")) {
            log.debug("Notifica commento duplicata, skip");
            return;
        }

        User receiver = userRepository.getReferenceById(receiverId);
        User triggeredBy = userRepository.getReferenceById(triggeredByUserId);
        Post post = postRepository.getReferenceById(postId);
        Comment comment = commentRepository.getReferenceById(commentId);

        Notification notification = Notification.builder()
                .user(receiver)
                .type(NotificationType.COMMENT)
                .triggeredByUser(triggeredBy)
                .relatedPost(post)
                .relatedComment(comment)
                .content(String.format("%s ha commentato il tuo post",
                        triggeredBy.getFullName()))
                .actionUrl("/post/" + postId)
                .isRead(false)
                .build();

        notificationRepository.save(notification);
        log.info("Notifica commento creata - ID: {}", notification.getId());

        // Pubblica evento per invio WebSocket asincrono
        publishNotificationEvent(receiver.getUsername(), notification);
    }

    /**
     * Crea una notifica quando un utente risponde a un commento.
     * <p>
     * La notifica viene inviata all'autore del commento originale.
     * È simile a creaNotificaCommento ma con un messaggio diverso.
     *
     * @param receiverId       L'ID dell'autore del commento originale
     * @param triggeredByUserId L'ID dell'utente che ha risposto
     * @param postId           L'ID del post
     * @param commentId        L'ID della risposta
     */
    @Transactional
    public void creaNotificaRisposta(Long receiverId, Long triggeredByUserId,
                                     Long postId, Long commentId) {
        log.debug("Creazione notifica risposta - Ricevente: {}, Autore: {}",
                receiverId, triggeredByUserId);

        if (receiverId.equals(triggeredByUserId)) {
            return;
        }

        if (esisteNotificaDuplicata(receiverId, triggeredByUserId, NotificationType.COMMENT,
                commentId, "COMMENT")) {
            log.debug("Notifica risposta duplicata, skip");
            return;
        }

        User receiver = userRepository.getReferenceById(receiverId);
        User triggeredBy = userRepository.getReferenceById(triggeredByUserId);
        Post post = postRepository.getReferenceById(postId);
        Comment comment = commentRepository.getReferenceById(commentId);

        Notification notification = Notification.builder()
                .user(receiver)
                .type(NotificationType.COMMENT)
                .triggeredByUser(triggeredBy)
                .relatedPost(post)
                .relatedComment(comment)
                .content(String.format("%s ha risposto al tuo commento",
                        triggeredBy.getFullName()))
                .actionUrl("/post/" + postId)
                .isRead(false)
                .build();

        notificationRepository.save(notification);
        log.info("Notifica risposta creata - ID: {}", notification.getId());

        // Pubblica evento per invio WebSocket asincrono
        publishNotificationEvent(receiver.getUsername(), notification);
    }

    /**
     * Crea una notifica quando un utente viene menzionato.
     * <p>
     * Le menzioni possono avvenire in:
     * - Post (es: "Che ne pensi @username?")
     * - Commenti
     * 
     * <p>
     * Il contenuto e l'URL della notifica variano in base al tipo di menzione.
     *
     * @param receiverId       L'ID dell'utente menzionato
     * @param triggeredByUserId L'ID dell'utente che ha fatto la menzione
     * @param type             Il tipo di contenuto dove è avvenuta la menzione
     * @param relatedId        L'ID del contenuto (post o commento)
     */
    @Transactional
    public void creaNotificaMenzione(Long receiverId, Long triggeredByUserId,
                                     MentionableType type, Long relatedId) {
        log.debug("Creazione notifica menzione - Ricevente: {}, Tipo: {}",
                receiverId, type);

        if (receiverId.equals(triggeredByUserId)) {
            return;
        }

        User receiver = userRepository.getReferenceById(receiverId);
        User triggeredBy = userRepository.getReferenceById(triggeredByUserId);

        String content;
        String actionUrl;

        // Costruisci contenuto e URL in base al tipo
        switch (type) {
            case POST -> {
                content = String.format("%s ti ha menzionato in un post",
                        triggeredBy.getFullName());
                actionUrl = "/post/" + relatedId;
            }
            case COMMENT -> {
                Comment comment = commentRepository.getReferenceById(relatedId);
                content = String.format("%s ti ha menzionato in un commento",
                        triggeredBy.getFullName());
                actionUrl = "/post/" + comment.getPost().getId();
            }
            
            default -> {
                log.warn("Tipo menzione non gestito: {}", type);
                return;
            }
        }

        Notification notification = Notification.builder()
                .user(receiver)
                .type(NotificationType.MENTION)
                .triggeredByUser(triggeredBy)
                .content(content)
                .actionUrl(actionUrl)
                .isRead(false)
                .build();

        notificationRepository.save(notification);
        log.info("Notifica menzione creata - ID: {}", notification.getId());

        // Pubblica evento per invio WebSocket asincrono
        publishNotificationEvent(receiver.getUsername(), notification);
    }

    /**
     * Crea una notifica per un nuovo messaggio diretto.
     * <p>
     * Viene creata ogni volta che un utente riceve un messaggio privato.
     * L'actionUrl porta alla conversazione con il mittente.
     *
     * @param receiverId L'ID del destinatario del messaggio
     * @param senderId   L'ID del mittente del messaggio
     * @param messageId  L'ID del messaggio inviato
     */
    @Transactional
    public void creaNotificaMessaggio(Long receiverId, Long senderId, Long messageId) {
        log.debug("Creazione notifica messaggio - Ricevente: {}, Mittente: {}",
                receiverId, senderId);

        User receiver = userRepository.getReferenceById(receiverId);
        User sender = userRepository.getReferenceById(senderId);
        DirectMessage message = directMessageRepository.getReferenceById(messageId);

        Notification notification = Notification.builder()
                .user(receiver)
                .type(NotificationType.DIRECT_MESSAGE)
                .triggeredByUser(sender)
                .relatedMessage(message)
                .content(String.format("%s ti ha inviato un messaggio", sender.getFullName()))
                .actionUrl("/messages/" + senderId)
                .isRead(false)
                .build();

        notificationRepository.save(notification);
        log.info("Notifica messaggio creata - ID: {}", notification.getId());

        // Pubblica evento per invio WebSocket asincrono
        publishNotificationEvent(receiver.getUsername(), notification);
    }

    /**
     * Crea notifiche per tutti gli utenti quando viene pubblicato un nuovo post.
     * <p>
     * Ogni utente attivo (tranne l'autore) riceve una notifica che qualcuno
     * ha pubblicato un nuovo post. Utile per social network piccoli come classi scolastiche.
     * <p>
     * Le notifiche sono inviate sia nel database che via WebSocket per real-time.
     * <p>
     * OTTIMIZZAZIONI:
     * - Usa saveAll() invece di save() in loop per ridurre le query DB
     * - È @Transactional per garantire una sessione Hibernate attiva nel thread async
     * - Gestisce errori WebSocket senza bloccare il salvataggio
     *
     * @param authorId L'ID dell'autore del post
     * @param postId   L'ID del post appena creato
     */
    @Transactional
    public void creaNotificheNuovoPost(Long authorId, Long postId) {
        log.info("Creazione notifiche nuovo post - Autore ID: {}, Post ID: {}", authorId, postId);

        // Usa findById invece di getReferenceById per caricare i dati subito
        // Questo evita LazyInitializationException nel thread async
        User author = userRepository.findById(authorId).orElse(null);
        Post post = postRepository.findById(postId).orElse(null);
        
        if (author == null || post == null) {
            log.warn("Autore o post non trovato - AuthorId: {}, PostId: {}", authorId, postId);
            return;
        }

        // Carica il fullName subito mentre la sessione è attiva
        String authorFullName = author.getFullName();

        // Trova tutti gli utenti attivi TRANNE l'autore
        List<User> allUsers = userRepository.findByIsActiveTrue();

        // Crea tutte le notifiche in memoria
        List<Notification> notifications = allUsers.stream()
                .filter(user -> !user.getId().equals(authorId))  // Salta l'autore
                .map(user -> Notification.builder()
                        .user(user)
                        .type(NotificationType.NEW_POST)
                        .triggeredByUser(author)
                        .relatedPost(post)
                        .content(String.format("%s ha pubblicato un nuovo post", authorFullName))
                        .actionUrl("/post/" + postId)
                        .isRead(false)
                        .build())
                .toList();

        // Salva tutte le notifiche con una singola operazione batch
        // Questo è MOLTO più efficiente del save() in loop
        List<Notification> savedNotifications = notificationRepository.saveAll(notifications);

        log.info("Notifiche nuovo post salvate: {} notifiche create", savedNotifications.size());

        // Pubblica eventi per invio WebSocket asincrono
        for (Notification notification : savedNotifications) {
            publishNotificationEvent(notification.getUser().getUsername(), notification);
        }

        log.info("Eventi WebSocket pubblicati per {} notifiche", savedNotifications.size());
    }

    /**
     * Ottiene tutte le notifiche di un utente in formato paginato.
     * <p>
     * Le notifiche sono ordinate dalla più recente alla più vecchia.
     * Utilizzato per visualizzare la lista completa delle notifiche.
     *
     * @param userId   L'ID dell'utente
     * @param pageable Parametri di paginazione (page, size, sort)
     * @return Page di NotificationResponseDTO
     */
    @Transactional(readOnly = true)
    public Page<NotificationResponseDTO> ottieniNotifiche(Long userId, Pageable pageable) {
        log.debug("Caricamento notifiche per utente ID: {}", userId);

        Page<Notification> notifications = notificationRepository
                .findByUserIdOrderByCreatedAtDesc(userId, pageable);

        return notifications.map(notificationMapper::toNotificaResponseDTO);
    }

    /**
     * Ottiene solo le notifiche non ancora lette dall'utente.
     * <p>
     * Utilizzato per mostrare le notifiche che richiedono attenzione.
     *
     * @param userId L'ID dell'utente
     * @return Lista di NotificationResponseDTO non lette
     */
    @Transactional(readOnly = true)
    public List<NotificationResponseDTO> ottieniNotificheNonLette(Long userId) {
        log.debug("Caricamento notifiche non lette per utente ID: {}", userId);

        List<Notification> notifications = notificationRepository
                .findByUserIdAndIsReadFalseOrderByCreatedAtDesc(userId);

        return notifications.stream()
                .map(notificationMapper::toNotificaResponseDTO)
                .toList();
    }

    /**
     * Ottiene le ultime N notifiche dell'utente.
     * <p>
     * Utilizzato per popolare il dropdown delle notifiche nell'header
     * senza caricare tutte le notifiche dell'utente.
     *
     * @param userId L'ID dell'utente
     * @param limit  Il numero massimo di notifiche da restituire
     * @return Lista delle ultime N notifiche
     */
    @Transactional(readOnly = true)
    public List<NotificationResponseDTO> ottieniNotificheRecenti(Long userId, int limit) {
        log.debug("Caricamento ultime {} notifiche per utente ID: {}", limit, userId);

        Pageable pageable = PageRequest.of(0, limit);
        List<Notification> notifications = notificationRepository
                .findRecentNotifications(userId, pageable);

        return notifications.stream()
                .map(notificationMapper::toNotificaResponseDTO)
                .toList();
    }

    /**
     * Conta il numero di notifiche non lette di un utente.
     * <p>
     * Utilizzato per mostrare il badge con il contatore nell'header.

     * @param userId L'ID dell'utente
     * @return Il numero di notifiche non lette
     */
    @Transactional(readOnly = true)
    public long contaNotificheNonLette(Long userId) {
        return notificationRepository.countByUserIdAndIsReadFalse(userId);
    }

    /**
     * Marca una singola notifica come letta.
     * <p>
     * Viene chiamato quando l'utente clicca su una notifica o la visualizza.
     * Verifica che la notifica appartenga effettivamente all'utente.
     *
     * @param notificationId L'ID della notifica
     * @param userId         L'ID dell'utente (per verifica autorizzazione)
     * @throws ResourceNotFoundException se la notifica non esiste
     * @throws UnauthorizedException     se la notifica non appartiene all'utente
     */
    @Transactional
    public void marcaComeLetta(Long notificationId, Long userId) {
        log.debug("Marca notifica {} come letta per utente {}", notificationId, userId);

        Notification notification = notificationRepository.findById(notificationId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        ENTITY_NOTIFICATION, FIELD_ID, notificationId));

        // Verifica che la notifica appartenga all'utente
        if (!notification.getUser().getId().equals(userId)) {
            throw new UnauthorizedException(
                    "Non hai i permessi per modificare questa notifica");
        }

        notification.setIsRead(true);
        notificationRepository.save(notification);

        log.info("Notifica {} marcata come letta", notificationId);
    }

    /**
     * Marca tutte le notifiche di un utente come lette.
     * <p>
     * Funzionalità "Segna tutte come lette" che azzera il contatore
     * delle notifiche non lette.
     *
     * @param userId L'ID dell'utente
     */
    @Transactional
    public void marcaTutteComeLette(Long userId) {
        log.debug("Marca tutte le notifiche come lette per utente {}", userId);

        notificationRepository.markAllAsRead(userId);

        log.info("Tutte le notifiche marcate come lette per utente {}", userId);
    }

    /**
     * Elimina una singola notifica.
     * <p>
     * L'utente può eliminare le proprie notifiche per fare pulizia.
     * Verifica che la notifica appartenga all'utente.
     *
     * @param notificationId L'ID della notifica da eliminare
     * @param userId         L'ID dell'utente (per verifica autorizzazione)
     * @throws ResourceNotFoundException se la notifica non esiste
     * @throws UnauthorizedException     se la notifica non appartiene all'utente
     */
    @Transactional
    public void eliminaNotifica(Long notificationId, Long userId) {
        log.debug("Eliminazione notifica {} per utente {}", notificationId, userId);

        Notification notification = notificationRepository.findById(notificationId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        ENTITY_NOTIFICATION, FIELD_ID, notificationId));

        // Verifica che la notifica appartenga all'utente
        if (!notification.getUser().getId().equals(userId)) {
            throw new UnauthorizedException(
                    "Non hai i permessi per eliminare questa notifica");
        }

        notificationRepository.delete(notification);

        log.info("Notifica {} eliminata", notificationId);
    }

    /**
     * Elimina tutte le notifiche già lette di un utente.
     * <p>
     * Funzionalità di pulizia che mantiene solo le notifiche non lette.
     * Utile per gli utenti che vogliono fare ordine nelle notifiche.
     *
     * PERFORMANCE: Usa batch delete query invece di caricare tutte le notifiche.
     *
     * @param userId L'ID dell'utente
     * @return Il numero di notifiche eliminate
     */
    @Transactional
    public int eliminaNotificheLette(Long userId) {
        log.debug("Eliminazione notifiche lette per utente {}", userId);

        int count = notificationRepository.deleteByUserIdAndIsReadTrue(userId);

        log.info("Eliminate {} notifiche lette per utente {}", count, userId);
        return count;
    }

    /**
     * Elimina TUTTE le notifiche di un utente (lette e non lette).
     * <p>
     * Funzionalità di pulizia totale delle notifiche.
     *
     * @param userId L'ID dell'utente
     * @return Il numero di notifiche eliminate
     */
    @Transactional
    public int eliminaTutteLeNotifiche(Long userId) {
        log.debug("Eliminazione TUTTE le notifiche per utente {}", userId);

        int count = notificationRepository.deleteAllByUserId(userId);

        log.info("Eliminate {} notifiche totali per utente {}", count, userId);
        return count;
    }

    /**
     * Pulisce automaticamente le notifiche vecchie dal database.
     * <p>
     * Questo metodo viene chiamato da uno scheduled job per mantenere
     * il database pulito ed evitare che accumuli troppe notifiche.
     * <p>
     * Elimina tutte le notifiche più vecchie del numero di giorni specificato,
     * indipendentemente dal fatto che siano lette o meno.
     *
     * @param giorni Il numero di giorni oltre i quali le notifiche vengono eliminate
     */
    @Transactional
    public void pulisciNotificheVecchie(int giorni) {
        log.info("Pulizia notifiche più vecchie di {} giorni", giorni);

        LocalDateTime threshold = LocalDateTime.now().minusDays(giorni);
        notificationRepository.deleteOldNotifications(threshold);

        log.info("Notifiche vecchie eliminate");
    }

    /**
     * Verifica se esiste già una notifica duplicata recente.
     * <p>
     * Previene spam di notifiche controllando se esiste già una notifica
     * simile creata negli ultimi 5 minuti.
     * <p>

     * @param userId           L'ID del ricevente
     * @param triggeredByUserId L'ID dell'utente che ha scatenato la notifica
     * @param type             Il tipo di notifica
     * @param relatedId        L'ID dell'entità correlata (post, comment, etc)
     * @param contentType      Il tipo di contenuto ("POST", "COMMENT", etc)
     * @return true se esiste un duplicato, false altrimenti
     */
    private boolean esisteNotificaDuplicata(Long userId, Long triggeredByUserId,
                                            NotificationType type, Long relatedId,
                                            String contentType) {
        LocalDateTime since = LocalDateTime.now().minusMinutes(DUPLICATE_CHECK_MINUTES);

        List<Notification> duplicates = notificationRepository.findDuplicateNotifications(
                userId, triggeredByUserId, type, relatedId, contentType, since);

        return !duplicates.isEmpty();
    }

    /**
     * Pubblica un evento per l'invio di una notifica via WebSocket.
     * <p>
     * Questo metodo helper viene usato da tutti i metodi di creazione notifiche
     * per disaccoppiare la logica di business dall'invio WebSocket.
     * <p>
     * Il listener WebSocketEventListener si occuperà di:
     * - Ricevere l'evento in modo asincrono
     * - Inviare la notifica via WebSocket
     * - Gestire eventuali errori senza bloccare il flusso principale
     *
     * @param username L'username dell'utente destinatario
     * @param notification La notifica da inviare
     */
    private void publishNotificationEvent(String username, Notification notification) {
        try {
            NotificationResponseDTO notificationDTO = notificationMapper.toNotificaResponseDTO(notification);
            eventPublisher.publishEvent(new NotificationCreatedEvent(username, notificationDTO));
            log.debug("Evento NotificationCreatedEvent pubblicato per utente: {}", username);
        } catch (Exception e) {
            // Log ma non bloccare se fallisce la pubblicazione dell'evento
            log.error("Errore pubblicazione evento notifica per {}: {}", username, e.getMessage());
        }
    }
}
