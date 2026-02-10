package com.example.backend.services;

import com.example.backend.dtos.request.CreaCommentoRequestDTO;
import com.example.backend.dtos.response.CommentResponseDTO;
import com.example.backend.events.CommentCreatedEvent;
import com.example.backend.events.CommentDeletedEvent;
import com.example.backend.events.CommentUpdatedEvent;
import com.example.backend.events.DeleteMentionsEvent;
import com.example.backend.events.MentionsToProcessEvent;
import com.example.backend.exception.InvalidInputException;
import com.example.backend.exception.ResourceNotFoundException;
import com.example.backend.exception.UnauthorizedException;
import com.example.backend.mappers.CommentMapper;
import com.example.backend.models.Comment;
import com.example.backend.models.HiddenComment;
import com.example.backend.models.MentionableType;
import com.example.backend.models.Post;
import com.example.backend.models.User;
import com.example.backend.repositories.CommentRepository;
import com.example.backend.repositories.HiddenCommentRepository;
import com.example.backend.repositories.PostRepository;
import com.example.backend.repositories.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

/**
 * Service per la gestione dei commenti ai post.
 *
 * Gestisce una struttura gerarchica di commenti dove:
 * - Commenti principali: hanno parentComment = null
 * - Risposte: hanno parentComment != null e puntano al commento padre
 *
 * La profondità massima è di due livelli:
 * Post → Commento → Risposta; non è possibile rispondere a una risposta.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class CommentService {

    private final CommentRepository commentRepository;
    private final PostRepository postRepository;
    private final UserRepository userRepository;
    private final HiddenCommentRepository hiddenCommentRepository;
    private final CommentMapper commentMapper;
    private final NotificationService notificationService;
    private final ApplicationEventPublisher eventPublisher;
    private static final String ENTITY_COMMENT = "Commento";
    private static final String ENTITY_POST = "Post";
    private static final String ENTITY_USER = "Utente";
    private static final String FIELD_ID = "id";
 

    /**
     * Crea un nuovo commento o risposta a un post.
     *
     * Questo metodo gestisce sia i commenti principali che le risposte.
     * - Se parentCommentId è null: crea un commento principale al post
     * - Se parentCommentId è presente: crea una risposta a quel commento
     *
     * Validazioni:
     * - Il post deve esistere e non essere cancellato
     * - Se è una risposta, il commento padre deve esistere e appartenere allo stesso post
     * - Non è possibile rispondere a una risposta.
     *
     * Dopo aver creato il commento, aggiorna automaticamente il contatore commentsCount
     * del post usando il repository.
     *
     * @param postId L'ID del post a cui commentare
     * @param userId L'ID dell'utente che sta commentando
     * @param request Il DTO con il contenuto del commento e l'eventuale parentCommentId
     * @return CommentResponseDTO con i dati del commento appena creato
     * @throws ResourceNotFoundException se post, utente o commento padre non esistono
     * @throws InvalidInputException se si tenta di rispondere a una risposta (depth > 2)
     */
    @Transactional
    public CommentResponseDTO creaCommento(Long postId, Long userId, CreaCommentoRequestDTO request) {
        log.info("Creazione commento per post ID: {} da utente ID: {}", postId, userId);

        Post post = postRepository.findById(postId)
                .orElseThrow(() -> new ResourceNotFoundException(ENTITY_POST, FIELD_ID, postId));

        if (post.getIsDeletedByAuthor().booleanValue()) {
            log.warn("Tentativo di commentare post cancellato - Post ID: {}", postId);
            throw new ResourceNotFoundException(ENTITY_POST, FIELD_ID, postId);
        }

        User autore = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException(ENTITY_USER, FIELD_ID, userId));

        Comment parentComment = null;
        if (request.getParentCommentId() != null) {
            parentComment = commentRepository.findById(request.getParentCommentId())
                    .orElseThrow(() -> new ResourceNotFoundException(
                            ENTITY_COMMENT, FIELD_ID, request.getParentCommentId()));

            if (!parentComment.getPost().getId().equals(postId)) {
                log.warn("Tentativo di rispondere a commento di post diverso - Commento ID: {}, Post ID: {}",
                        request.getParentCommentId(), postId);
                throw new InvalidInputException(
                        "Il commento a cui stai rispondendo non appartiene a questo post");
            }

            if (parentComment.getParentComment() != null) {
                log.warn("Tentativo di rispondere a una risposta - Commento ID: {}",
                        request.getParentCommentId());
                throw new InvalidInputException(
                        "Non è possibile rispondere a una risposta. Puoi rispondere solo ai commenti principali.");
            }

            if (parentComment.getIsDeletedByAuthor().booleanValue()) {
                log.warn("Tentativo di rispondere a commento cancellato - Commento ID: {}",
                        request.getParentCommentId());
                throw new ResourceNotFoundException(ENTITY_COMMENT, FIELD_ID, request.getParentCommentId());
            }
        }

        Comment comment = Comment.builder()
                .post(post)
                .user(autore)
                .parentComment(parentComment)
                .content(request.getContenuto())
                .isDeletedByAuthor(false)
                .build();

        comment = commentRepository.save(comment);

        // Aggiorna contatore
        postRepository.updateCommentsCount(postId, 1);

        // Crea notifiche
        if (parentComment == null) {
            // Commento principale - notifica autore post
            notificationService.creaNotificaCommento(
                    post.getUser().getId(),
                    userId,
                    postId,
                    comment.getId()
            );
        } else {
            // Risposta - notifica autore commento padre
            notificationService.creaNotificaRisposta(
                    parentComment.getUser().getId(),
                    userId,
                    postId,
                    comment.getId()
            );

            // Notifica anche autore post se è diverso da autore commento padre
            if (!parentComment.getUser().getId().equals(post.getUser().getId())) {
                notificationService.creaNotificaCommento(
                        post.getUser().getId(),
                        userId,
                        postId,
                        comment.getId()
                );
            }
        }

        // Pubblica evento per processing menzioni asincrono
        if (request.getContenuto() != null && !request.getContenuto().isBlank()) {
            eventPublisher.publishEvent(new MentionsToProcessEvent(
                    MentionableType.COMMENT,
                    comment.getId(),
                    request.getContenuto(),
                    userId,
                    false // non è un update
            ));
            log.debug("Evento MentionsToProcessEvent pubblicato per commento ID: {}", comment.getId());
        }

        log.info("Commento creato con successo - ID: {} per post ID: {} da utente: {}",
                comment.getId(), postId, autore.getUsername());

        // Pubblica evento per broadcast WebSocket
        eventPublisher.publishEvent(new CommentCreatedEvent(
                postId,
                comment.getId(),
                parentComment != null ? parentComment.getId() : null
        ));
        log.debug("Evento CommentCreatedEvent pubblicato per commento ID: {}", comment.getId());

        return commentMapper.toCommentoResponseDTO(comment);
    }

    /**
     * Modifica un commento esistente.
     *
     * Permette all'autore di modificare il contenuto di un commento.
     * Solo l'autore del commento può modificarlo.
     * Non è possibile modificare commenti cancellati.
     *
     * La modifica aggiorna automaticamente il campo updatedAt grazie a @LastModifiedDate.
     * Questo permette di mostrare nell'interfaccia "Modificato" se updatedAt > createdAt.
     *
     * @param commentId L'ID del commento da modificare
     * @param userId L'ID dell'utente che richiede la modifica
     * @param nuovoContenuto Il nuovo contenuto del commento
     * @return CommentResponseDTO con i dati aggiornati
     * @throws ResourceNotFoundException se il commento non esiste o è cancellato
     * @throws UnauthorizedException se l'utente non è l'autore
     */
    @Transactional
    public CommentResponseDTO modificaCommento(Long commentId, Long userId, String nuovoContenuto) {
        log.info("Modifica commento ID: {} da utente ID: {}", commentId, userId);

        // Carica il commento
        Comment comment = commentRepository.findById(commentId)
                .orElseThrow(() -> new ResourceNotFoundException(ENTITY_COMMENT, FIELD_ID, commentId));

        // Verifica che l'utente sia l'autore
        if (!comment.getUser().getId().equals(userId)) {
            log.warn("Tentativo di modifica commento non autorizzato - Commento ID: {}, Utente ID: {}",
                    commentId, userId);
            throw new UnauthorizedException("Non hai i permessi per modificare questo commento");
        }

        // Verifica che il commento non sia cancellato
        if (comment.getIsDeletedByAuthor().booleanValue()) {
            log.warn("Tentativo di modificare commento cancellato - Commento ID: {}", commentId);
            throw new ResourceNotFoundException(ENTITY_COMMENT, FIELD_ID, commentId);
        }

        // Valida il nuovo contenuto
        if (nuovoContenuto == null || nuovoContenuto.trim().isEmpty()) {
            throw new InvalidInputException("Il contenuto del commento non può essere vuoto");
        }

        // Aggiorna il contenuto
        comment.setContent(nuovoContenuto);

        // Salva
        comment = commentRepository.save(comment);

        // Pubblica evento per aggiornamento menzioni asincrono
        eventPublisher.publishEvent(new MentionsToProcessEvent(
                MentionableType.COMMENT,
                commentId,
                nuovoContenuto,
                userId,
                true // è un update
        ));
        log.debug("Evento MentionsToProcessEvent (update) pubblicato per commento ID: {}", commentId);

        // Pubblica evento per broadcast WebSocket
        eventPublisher.publishEvent(new CommentUpdatedEvent(
                comment.getPost().getId(),
                commentId
        ));
        log.debug("Evento CommentUpdatedEvent pubblicato per commento ID: {}", commentId);

        log.info("Commento modificato con successo - ID: {}", commentId);

        return commentMapper.toCommentoResponseDTO(comment);
    }

    /**
     * Elimina un commento (soft delete) e tutte le sue risposte in modo ricorsivo.
     *
     * Quando un commento viene eliminato, vengono eliminate anche tutte le sue risposte (childComments).
     * Questo evita di avere risposte "orfane" nel sistema e mantiene consistenza nei contatori.
     *
     * Comportamento:
     * - Il commento e tutte le sue risposte vengono marcati come cancellati (isDeletedByAuthor = true)
     * - Il contatore commentsCount del post viene decrementato per ogni commento eliminato
     * - Eventi WebSocket vengono pubblicati per ogni commento eliminato
     * - Menzioni vengono eliminate per ogni commento
     *
     * @param commentId L'ID del commento da eliminare
     * @param userId L'ID dell'utente che richiede l'eliminazione
     * @throws ResourceNotFoundException se il commento non esiste
     * @throws UnauthorizedException se l'utente non è l'autore
     */
    @Transactional
    public void eliminaCommento(Long commentId, Long userId) {
        log.info("Eliminazione commento ID: {} da utente ID: {}", commentId, userId);

        // Carica il commento
        Comment comment = commentRepository.findById(commentId)
                .orElseThrow(() -> new ResourceNotFoundException(ENTITY_COMMENT, FIELD_ID, commentId));

        // Verifica che l'utente sia l'autore
        if (!comment.getUser().getId().equals(userId)) {
            log.warn("Tentativo di eliminazione commento non autorizzato - Commento ID: {}, Utente ID: {}",
                    commentId, userId);
            throw new UnauthorizedException("Non hai i permessi per eliminare questo commento");
        }

        // Elimina ricorsivamente il commento e tutte le sue risposte
        int deletedCount = deleteCommentAndChildren(comment);

        log.info("Commento {} e {} risposte eliminati con successo (soft delete)", commentId, deletedCount - 1);
    }

    /**
     * Elimina ricorsivamente un commento e tutti i suoi figli (soft delete).
     * Decrementa il contatore del post e pubblica eventi per ogni commento eliminato.
     *
     * @param comment Il commento da eliminare
     * @return Il numero totale di commenti eliminati (incluso il parent)
     */
    private int deleteCommentAndChildren(Comment comment) {
        if (comment.getIsDeletedByAuthor()) {
            // Già eliminato, skippa
            return 0;
        }

        Long postId = comment.getPost().getId();
        Long commentId = comment.getId();
        int deletedCount = 0;

        // 1. Trova e elimina ricorsivamente tutti i figli
        List<Comment> children = commentRepository.findAllChildCommentsByParentId(commentId);
        for (Comment child : children) {
            deletedCount += deleteCommentAndChildren(child);
        }

        // 2. Elimina il commento corrente (soft delete)
        comment.setIsDeletedByAuthor(true);
        commentRepository.save(comment);
        deletedCount++;

        // 3. Decrementa il contatore del post
        postRepository.updateCommentsCount(postId, -1);

        // 4. Pubblica evento per eliminazione menzioni asincrona
        eventPublisher.publishEvent(new DeleteMentionsEvent(MentionableType.COMMENT, commentId));
        log.debug("Evento DeleteMentionsEvent pubblicato per commento ID: {}", commentId);

        // 5. Pubblica evento per broadcast WebSocket
        eventPublisher.publishEvent(new CommentDeletedEvent(postId, commentId));
        log.debug("Evento CommentDeletedEvent pubblicato per commento ID: {}", commentId);

        return deletedCount;
    }

    /**
     * Ottiene tutti i commenti di un post con struttura gerarchica.
     *
     * Questo metodo restituisce i commenti principali, e ogni commento include
     * le sue risposte nella proprietà "risposte" del DTO.
     *
     * OTTIMIZZAZIONE N+1:
     * Questo metodo usa una strategia a query batch per evitare il problema N+1:
     * 1. Carica tutti i root comments con i loro user (JOIN FETCH)
     * 2. Carica gli ID dei commenti nascosti dall'utente in una singola query
     * 3. Carica tutte le risposte in batch con i loro user (JOIN FETCH)
     * Questo riduce drasticamente il numero di query da O(N+M) a solo 3 query fisse.
     *
     * @param postId L'ID del post
     * @param userId L'ID dell'utente che sta visualizzando
     * @return Lista di CommentResponseDTO con struttura gerarchica
     * @throws ResourceNotFoundException se il post non esiste
     */
    @Transactional(readOnly = true)
    public List<CommentResponseDTO> ottieniCommentiPost(Long postId, Long userId) {
        log.debug("Caricamento commenti per post ID: {} e utente ID: {}", postId, userId);

        // Verifica che il post esista
        if (!postRepository.existsById(postId)) {
            throw new ResourceNotFoundException(ENTITY_POST, FIELD_ID, postId);
        }

        // 1. Carica i commenti root con i loro user (JOIN FETCH nel repository)
        List<Comment> rootComments = commentRepository.findRootCommentsByPostId(postId);

        if (rootComments.isEmpty()) {
            log.debug("Nessun commento trovato per post ID: {}", postId);
            return List.of();
        }

        // 2. Carica gli ID dei commenti nascosti dall'utente (evita N+1)
        var hiddenCommentIds = hiddenCommentRepository.findHiddenCommentIdsByUserId(userId);

        // Filtra i commenti nascosti dall'utente
        List<Comment> visibleRootComments = rootComments.stream()
                .filter(comment -> !hiddenCommentIds.contains(comment.getId()))
                .toList();

        if (visibleRootComments.isEmpty()) {
            log.debug("Nessun commento visibile per post ID: {} (tutti nascosti)", postId);
            return List.of();
        }

        // 3. Carica tutte le risposte in batch con i loro user (evita N+1)
        List<Long> rootCommentIds = visibleRootComments.stream()
                .map(Comment::getId)
                .toList();

        List<Comment> allChildComments = commentRepository.findChildCommentsByParentIds(rootCommentIds);

        // 4. Popola manualmente i childComments nei root comments
        // Raggruppa le risposte per parentComment ID
        var childCommentsByParentId = allChildComments.stream()
                .collect(Collectors.groupingBy(c -> c.getParentComment().getId()));

        // Associa le risposte ai commenti parent
        visibleRootComments.forEach(rootComment -> {
            List<Comment> children = childCommentsByParentId.getOrDefault(rootComment.getId(), List.of());
            rootComment.getChildComments().clear();
            rootComment.getChildComments().addAll(children);
        });

        log.debug("Trovati {} commenti principali con {} risposte totali per post ID: {}",
                visibleRootComments.size(), allChildComments.size(), postId);

        // Converte in DTO con struttura gerarchica
        return visibleRootComments.stream()
                .map(commentMapper::toCommentoResponseDTO)
                .toList();
    }

    /**
     * Nasconde un commento per l'utente corrente.
     *
     *
     *
     * @param commentId L'ID del commento da nascondere
     * @param userId L'ID dell'utente
     * @throws ResourceNotFoundException se il commento non esiste
     */
    @Transactional
    public void nascondiCommento(Long commentId, Long userId) {
        log.info("Nascondimento commento ID: {} per utente ID: {}", commentId, userId);

        // Verifica che il commento esista
        if (!commentRepository.existsById(commentId)) {
            throw new ResourceNotFoundException(ENTITY_COMMENT, FIELD_ID, commentId);
        }

        // Verifica che non sia già nascosto 
        if (hiddenCommentRepository.existsByCommentIdAndUserId(commentId, userId)) {
            log.debug("Commento ID: {} già nascosto per utente ID: {}", commentId, userId);
            return;
        }

        // Crea il record di nascondimento
        HiddenComment hiddenComment = HiddenComment.builder()
                .comment(commentRepository.getReferenceById(commentId))
                .user(userRepository.getReferenceById(userId))
                .build();

        hiddenCommentRepository.save(hiddenComment);

        log.info("Commento ID: {} nascosto per utente ID: {}", commentId, userId);
    }

    /**
     * Mostra un commento precedentemente nascosto.
     *
     * Operazione inversa di nascondiCommento.
     * Elimina il record da HiddenComment, rendendo il commento nuovamente visibile.
     *
     * @param commentId L'ID del commento da mostrare
     * @param userId L'ID dell'utente
     */
    @Transactional
    public void mostraCommento(Long commentId, Long userId) {
        log.info("Mostra commento ID: {} per utente ID: {}", commentId, userId);

        // Elimina il record di nascondimento se esiste
        hiddenCommentRepository.deleteByCommentIdAndUserId(commentId, userId);

        log.info("Commento ID: {} ora visibile per utente ID: {}", commentId, userId);
    }

    /**
     * Conta i commenti totali di un utente.
     *
     * Utile per mostrare statistiche nel profilo utente.
     * Include sia commenti principali che risposte.
     *
     * @param userId L'ID dell'utente
     * @return Il numero di commenti scritti dall'utente
     */
    @Transactional(readOnly = true)
    public long contaCommentiUtente(Long userId) {
        return commentRepository.countByUserId(userId);
    }

    /**
     * Ricalcola il contatore dei commenti di un post.
     *
     * THREAD-SAFETY:
     * Usa una query atomica che conta e aggiorna in un'unica operazione.
     * Questo elimina completamente la race condition del pattern read-modify-write.
     *
     * Utile per correggere eventuali disallineamenti tra il campo commentsCount
     * del post e il numero reale di commenti non cancellati.
     *
     * Può essere chiamato da:
     * - Job di manutenzione schedulati
     * - Admin panel per correzione dati
     * - Recovery dopo errori
     *
     * @param postId L'ID del post
     * @return Il nuovo valore del contatore
     */
    @Transactional
    public int ricalcolaContatoreCommenti(Long postId) {
        log.info("Ricalcolo contatore commenti per post ID: {}", postId);

        // Verifica che il post esista
        if (!postRepository.existsById(postId)) {
            throw new ResourceNotFoundException(ENTITY_POST, FIELD_ID, postId);
        }

        // Legge il valore vecchio solo per logging
        Post post = postRepository.findById(postId).orElseThrow();
        int oldCount = post.getCommentsCount();

        // Sincronizza atomicamente il contatore con la count reale
        // Questa query è thread-safe: UPDATE ... SET count = (SELECT COUNT(...))
        postRepository.syncCommentsCount(postId);

        // Rilegge per ottenere il nuovo valore
        long countReale = commentRepository.countByPostIdAndIsDeletedByAuthorFalse(postId);

        if (countReale != oldCount) {
            log.warn("Contatore commenti disallineato per post ID: {} - Vecchio: {}, Nuovo: {}",
                    postId, oldCount, countReale);
        }

        return (int) countReale;
    }

    /**
     * Elimina tutti i commenti di un post (soft delete).
     * Viene chiamato quando un post viene eliminato.
     *
     * @param postId L'ID del post
     */
    @Transactional
    public void deleteAllCommentsByPostId(Long postId) {
        log.info("Eliminazione di tutti i commenti per post ID: {}", postId);
        
        List<Comment> comments = commentRepository.findByPostId(postId);
        
        for (Comment comment : comments) {
            if (!comment.getIsDeletedByAuthor()) {
                comment.setIsDeletedByAuthor(true);
                commentRepository.save(comment);
                
                // Pubblica evento per eliminare le menzioni del commento
                eventPublisher.publishEvent(new DeleteMentionsEvent(MentionableType.COMMENT, comment.getId()));
                log.debug("Evento DeleteMentionsEvent pubblicato per commento ID: {}", comment.getId());
            }
        }
        
        log.info("Eliminati {} commenti per post ID: {}", comments.size(), postId);
    }
}