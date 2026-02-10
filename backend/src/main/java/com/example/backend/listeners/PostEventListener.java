package com.example.backend.listeners;

import com.example.backend.dtos.response.PostResponseDTO;
import com.example.backend.events.PostCreatedEvent;
import com.example.backend.events.PostDeletedEvent;
import com.example.backend.events.PostLikedEvent;
import com.example.backend.events.PostUpdatedEvent;
import com.example.backend.mappers.PostMapper;
import com.example.backend.models.Post;
import com.example.backend.repositories.PostRepository;
import com.example.backend.services.CommentService;
import com.example.backend.services.LikeService;
import com.example.backend.services.NotificationService;
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
 * Listener per gli eventi relativi ai post.
 * <p>
 * Questo componente ascolta gli eventi del dominio e reagisce in modo asincrono,
 * permettendo di disaccoppiare le operazioni principali (es. creazione post)
 * dalle operazioni secondarie (es. invio notifiche, broadcast WebSocket).
 * <p>
 * Usa @TransactionalEventListener con AFTER_COMMIT per garantire che
 * il post sia già stato salvato nel database prima di processarlo.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class PostEventListener {

    private final NotificationService notificationService;
    private final SimpMessagingTemplate messagingTemplate;
    private final PostRepository postRepository;
    private final PostMapper postMapper;
    private final LikeService likeService;
    private final CommentService commentService;

    /**
     * Gestisce l'evento di creazione di un nuovo post.
     * <p>
     * Quando viene pubblicato un nuovo post, questo listener:
     * 1. Attende che la transazione sia committata (AFTER_COMMIT)
     * 2. Viene eseguito in un thread separato (grazie a @Async)
     * 3. Broadcast del post a tutti gli utenti connessi via WebSocket
     * 4. Invoca il servizio di notifiche per notificare tutti gli utenti
     * <p>
     * Questo approccio garantisce che:
     * - Il post esiste già nel database quando il listener viene eseguito
     * - La transazione di creazione post non venga bloccata
     * - Il post appare in tempo reale nel feed di tutti gli utenti
     * - Eventuali errori nelle notifiche non facciano fallire la creazione del post
     *
     * @param event L'evento contenente i dati del post creato
     */
    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void handlePostCreated(PostCreatedEvent event) {
        log.info("Evento PostCreatedEvent ricevuto - Autore: {}, Post: {}",
                event.getAuthorId(), event.getPostId());

        try {
            // Broadcast del post via WebSocket a tutti gli utenti connessi
            broadcastNewPost(event.getPostId());
            
            // Chiama il servizio per creare le notifiche
            notificationService.creaNotificheNuovoPost(event.getAuthorId(), event.getPostId());

            log.info("Notifiche per nuovo post processate con successo - Post ID: {}",
                    event.getPostId());
        } catch (Exception e) {
            // Log dell'errore ma non propaghiamo l'eccezione
            // Il post è già stato creato, le notifiche sono "best effort"
            log.error("Errore durante il processing delle notifiche per post ID: {} - Errore: {}",
                    event.getPostId(), e.getMessage(), e);
        }
    }

    /**
     * Invia il nuovo post a tutti gli utenti connessi via WebSocket.
     * <p>
     * Il post viene broadcast sul topic /topic/posts dove tutti i client
     * connessi sono iscritti per ricevere i nuovi post in tempo reale.
     *
     * @param postId   L'ID del post da inviare
     */
    private void broadcastNewPost(Long postId) {
        try {
            // Usa findByIdWithUser per caricare anche l'autore (evita LazyInitializationException)
            Post post = postRepository.findByIdWithUser(postId).orElse(null);
            if (post == null) {
                log.warn("Post non trovato per broadcast - ID: {}", postId);
                return;
            }

            // Converti in DTO (null per currentUserId perché il like sarà false per tutti di default)
            PostResponseDTO postDTO = postMapper.toPostResponseDTO(post, null);

            // Broadcast a tutti gli utenti connessi
            messagingTemplate.convertAndSend("/topic/posts", postDTO);
            
            log.info("Post ID: {} broadcast via WebSocket su /topic/posts", postId);
        } catch (Exception e) {
            log.error("Errore broadcast post ID: {} via WebSocket: {}", postId, e.getMessage());
        }
    }

    /**
     * Gestisce l'evento di modifica di un post.
     * <p>
     * Quando un post viene modificato, questo listener broadcast il post aggiornato
     * a tutti gli utenti connessi via WebSocket.
     *
     * @param event L'evento contenente l'ID del post modificato
     */
    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void handlePostUpdated(PostUpdatedEvent event) {
        log.info("Evento PostUpdatedEvent ricevuto - Post ID: {}", event.getPostId());

        try {
            Post post = postRepository.findByIdWithUser(event.getPostId()).orElse(null);
            if (post == null) {
                log.warn("Post non trovato per broadcast update - ID: {}", event.getPostId());
                return;
            }

            PostResponseDTO postDTO = postMapper.toPostResponseDTO(post, null);
            messagingTemplate.convertAndSend("/topic/posts/updated", postDTO);
            
            log.info("Post modificato ID: {} broadcast via WebSocket su /topic/posts/updated", event.getPostId());
        } catch (Exception e) {
            log.error("Errore broadcast post update ID: {} via WebSocket: {}", event.getPostId(), e.getMessage());
        }
    }

    /**
     * Gestisce l'evento di cancellazione di un post.
     * <p>
     * Quando un post viene cancellato (soft delete), questo listener:
     * 1. Elimina tutti i like del post
     * 2. Elimina tutti i commenti del post (soft delete)
     * 3. Notifica tutti gli utenti connessi via WebSocket
     *
     * @param event L'evento contenente l'ID del post cancellato
     */
    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void handlePostDeleted(PostDeletedEvent event) {
        log.info("Evento PostDeletedEvent ricevuto - Post ID: {}", event.getPostId());

        try {
            // Elimina tutti i like del post
            likeService.deleteAllLikesByPostId(event.getPostId());
            log.info("Like eliminati per post ID: {}", event.getPostId());
            
            // Elimina tutti i commenti del post
            commentService.deleteAllCommentsByPostId(event.getPostId());
            log.info("Commenti eliminati per post ID: {}", event.getPostId());
            
            // Broadcast WebSocket
            Map<String, Object> deletePayload = new HashMap<>();
            deletePayload.put("postId", event.getPostId());
            deletePayload.put("type", "deleted");
            
            messagingTemplate.convertAndSend("/topic/posts/deleted", deletePayload);
            
            log.info("Post cancellato ID: {} broadcast via WebSocket su /topic/posts/deleted", event.getPostId());
        } catch (Exception e) {
            log.error("Errore gestione eliminazione post ID: {} - {}", event.getPostId(), e.getMessage());
        }
    }

    /**
     * Gestisce l'evento di like/unlike su un post.
     * <p>
     * Quando un utente mette o toglie like a un post, questo listener broadcast
     * l'aggiornamento del conteggio like a tutti gli utenti connessi.
     *
     * @param event L'evento contenente l'ID del post, il nuovo conteggio like e se è stato aggiunto o rimosso
     */
    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void handlePostLiked(PostLikedEvent event) {
        log.info("Evento PostLikedEvent ricevuto - Post ID: {}, Like count: {}, Liked: {}", 
                event.getPostId(), event.getLikesCount(), event.isLiked());

        try {
            Map<String, Object> likePayload = new HashMap<>();
            likePayload.put("postId", event.getPostId());
            likePayload.put("likesCount", event.getLikesCount());
            likePayload.put("liked", event.isLiked());
            likePayload.put("type", "like_update");
            
            messagingTemplate.convertAndSend("/topic/posts/liked", likePayload);
            
            log.info("Like update per post ID: {} broadcast via WebSocket su /topic/posts/liked", event.getPostId());
        } catch (Exception e) {
            log.error("Errore broadcast like update post ID: {} via WebSocket: {}", event.getPostId(), e.getMessage());
        }
    }
}
