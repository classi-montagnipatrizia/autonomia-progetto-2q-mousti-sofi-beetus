package com.example.backend.listeners;

import com.example.backend.dtos.response.CommentResponseDTO;
import com.example.backend.events.CommentCreatedEvent;
import com.example.backend.events.CommentDeletedEvent;
import com.example.backend.events.CommentUpdatedEvent;
import com.example.backend.mappers.CommentMapper;
import com.example.backend.models.Comment;
import com.example.backend.repositories.CommentRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

import java.util.HashMap;
import java.util.Map;

/**
 * Listener per gli eventi relativi ai commenti.
 * <p>
 * Questo componente ascolta gli eventi del dominio e reagisce in modo asincrono,
 * permettendo di broadcast i commenti via WebSocket per aggiornamenti in tempo reale.
 * <p>
 * Usa @TransactionalEventListener con AFTER_COMMIT per garantire che
 * il commento sia già stato salvato nel database prima di processarlo.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class CommentEventListener {

    private final SimpMessagingTemplate messagingTemplate;
    private final CommentRepository commentRepository;
    private final CommentMapper commentMapper;

    /**
     * Gestisce l'evento di creazione di un nuovo commento.
     * <p>
     * Broadcast il commento a tutti gli utenti che stanno visualizzando il post.
     *
     * @param event L'evento contenente i dati del commento creato
     */
    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void handleCommentCreated(CommentCreatedEvent event) {
        log.info("Evento CommentCreatedEvent ricevuto - Post: {}, Commento: {}, Parent: {}",
                event.getPostId(), event.getCommentId(), event.getParentCommentId());

        try {
            // Usa findByIdWithUser per evitare LazyInitializationException
            Comment comment = commentRepository.findByIdWithUser(event.getCommentId()).orElse(null);
            if (comment == null) {
                log.warn("Commento non trovato per broadcast - ID: {}", event.getCommentId());
                return;
            }

            // Usa il metodo senza risposte per evitare LazyInitializationException su childComments
            CommentResponseDTO commentDTO = commentMapper.toCommentoResponseDTOWithoutReplies(comment);
            
            Map<String, Object> payload = new HashMap<>();
            payload.put("postId", event.getPostId());
            payload.put("comment", commentDTO);
            payload.put("parentCommentId", event.getParentCommentId());
            payload.put("type", "comment_created");

            // Broadcast sul topic specifico del post
            messagingTemplate.convertAndSend("/topic/posts/" + event.getPostId() + "/comments", payload);
            
            // Broadcast globale del contatore commenti aggiornato (per il feed)
            broadcastCommentsCount(event.getPostId());
            
            log.info("Commento ID: {} broadcast via WebSocket su /topic/posts/{}/comments", 
                    event.getCommentId(), event.getPostId());
        } catch (Exception e) {
            log.error("Errore broadcast commento ID: {} via WebSocket: {}", 
                    event.getCommentId(), e.getMessage(), e);
        }
    }

    /**
     * Gestisce l'evento di modifica di un commento.
     *
     * @param event L'evento contenente l'ID del commento modificato
     */
    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void handleCommentUpdated(CommentUpdatedEvent event) {
        log.info("Evento CommentUpdatedEvent ricevuto - Post: {}, Commento: {}",
                event.getPostId(), event.getCommentId());

        try {
            // Usa findByIdWithUser per evitare LazyInitializationException
            Comment comment = commentRepository.findByIdWithUser(event.getCommentId()).orElse(null);
            if (comment == null) {
                log.warn("Commento non trovato per broadcast update - ID: {}", event.getCommentId());
                return;
            }

            // Usa il metodo senza risposte per evitare LazyInitializationException su childComments
            CommentResponseDTO commentDTO = commentMapper.toCommentoResponseDTOWithoutReplies(comment);
            
            Map<String, Object> payload = new HashMap<>();
            payload.put("postId", event.getPostId());
            payload.put("comment", commentDTO);
            payload.put("type", "comment_updated");

            messagingTemplate.convertAndSend("/topic/posts/" + event.getPostId() + "/comments", payload);
            
            log.info("Commento modificato ID: {} broadcast via WebSocket", event.getCommentId());
        } catch (Exception e) {
            log.error("Errore broadcast comment update ID: {} via WebSocket: {}", 
                    event.getCommentId(), e.getMessage(), e);
        }
    }

    /**
     * Gestisce l'evento di cancellazione di un commento.
     *
     * @param event L'evento contenente l'ID del commento cancellato
     */
    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void handleCommentDeleted(CommentDeletedEvent event) {
        log.info("Evento CommentDeletedEvent ricevuto - Post: {}, Commento: {}",
                event.getPostId(), event.getCommentId());

        try {
            Map<String, Object> payload = new HashMap<>();
            payload.put("postId", event.getPostId());
            payload.put("commentId", event.getCommentId());
            payload.put("type", "comment_deleted");

            messagingTemplate.convertAndSend("/topic/posts/" + event.getPostId() + "/comments", payload);
            
            // Broadcast globale del contatore commenti aggiornato (per il feed)
            broadcastCommentsCount(event.getPostId());
            
            log.info("Commento cancellato ID: {} broadcast via WebSocket", event.getCommentId());
        } catch (Exception e) {
            log.error("Errore broadcast comment delete ID: {} via WebSocket: {}", 
                    event.getCommentId(), e.getMessage(), e);
        }
    }

    /**
     * Invia un broadcast globale con il contatore commenti aggiornato.
     * Usato per aggiornare il feed in tempo reale.
     */
    private void broadcastCommentsCount(Long postId) {
        try {
            // Ottieni il conteggio aggiornato dal database
            long commentsCount = commentRepository.countByPostIdAndIsDeletedByAuthorFalse(postId);
            
            Map<String, Object> countPayload = new HashMap<>();
            countPayload.put("postId", postId);
            countPayload.put("commentsCount", commentsCount);
            countPayload.put("type", "comments_count_update");
            
            messagingTemplate.convertAndSend("/topic/posts/comments-count", countPayload);
            
            log.debug("Contatore commenti per post ID: {} broadcast: {}", postId, commentsCount);
        } catch (Exception e) {
            log.error("Errore broadcast contatore commenti per post ID: {}: {}", postId, e.getMessage());
        }
    }
}
