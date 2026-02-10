package com.example.backend.services;

import com.example.backend.dtos.response.UserSummaryDTO;
import com.example.backend.events.PostLikedEvent;
import com.example.backend.exception.ResourceNotFoundException;
import com.example.backend.mappers.UserMapper;
import com.example.backend.models.Like;
import com.example.backend.models.Post;
import com.example.backend.models.User;
import com.example.backend.repositories.LikeRepository;
import com.example.backend.repositories.PostRepository;
import com.example.backend.repositories.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.dao.DataIntegrityViolationException;
import java.util.List;
import java.util.Set;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Service per la gestione dei like ai post.
 * <p>
 * Gestisce tutte le operazioni relative ai like:
 * - Mettere e togliere like
 * - Verificare se un utente ha messo like
 * - Ottenere la lista degli utenti che hanno messo like
 * <p>
 * I like sono implementati come toggle: se metti like due volte, lo togli.
 * Ogni utente può mettere massimo un like per post.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class LikeService {

    private final LikeRepository likeRepository;
    private final PostRepository postRepository;
    private final UserRepository userRepository;
    private final UserMapper userMapper;
    private final ApplicationEventPublisher eventPublisher;

    private final NotificationService notificationService;
    private static final String ENTITY_POST = "Post";
    private static final String ENTITY_USER = "Utente";
    private static final String FIELD_ID = "id";

    /**
     * Mette o toglie like a un post.
     *
     * THREAD-SAFETY:
     * Questo metodo è thread-safe e gestisce correttamente race condition anche sotto carico elevato.
     * Usa un approccio DELETE-first atomico che garantisce consistenza anche con richieste concorrenti.
     *
     * Strategia:
     * 1. Prova prima a cancellare il like (DELETE atomico che restituisce quante righe ha cancellato)
     * 2. Se cancella 1 riga → like esisteva, lo rimuove e decrementa contatore
     * 3. Se cancella 0 righe → like non esisteva, prova ad inserirlo
     * 4. Se l'insert fallisce con constraint violation → like appena aggiunto da altro thread (race)
     *
     * @param postId L'ID del post
     * @param userId L'ID dell'utente che sta mettendo/togliendo like
     * @return true se il like è stato aggiunto, false se è stato rimosso
     * @throws ResourceNotFoundException se il post non esiste o è cancellato
     */
    @Transactional
    public boolean toggleLike(Long postId, Long userId) {
        log.info("Toggle like - Post ID: {}, Utente ID: {}", postId, userId);

        Post post = postRepository.findById(postId)
                .orElseThrow(() -> new ResourceNotFoundException(ENTITY_POST, FIELD_ID, postId));

        if (post.getIsDeletedByAuthor().booleanValue()) {
            log.warn("Tentativo di mettere like a post cancellato - Post ID: {}", postId);
            throw new ResourceNotFoundException(ENTITY_POST, FIELD_ID, postId);
        }

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException(ENTITY_USER, FIELD_ID, userId));

        // DELETE-first approach: prova a cancellare il like
        // Questa operazione è atomica e restituisce il numero di righe cancellate
        int deletedRows = likeRepository.deleteByUserIdAndPostId(userId, postId);

        if (deletedRows > 0) {
            // Like esisteva ed è stato rimosso
            postRepository.updateLikesCount(postId, -1);
            log.info("Like rimosso - Post ID: {}, Utente: {}", postId, user.getUsername());
            
            // Pubblica evento per broadcast real-time
            int newLikesCount = post.getLikesCount() - 1;
            eventPublisher.publishEvent(new PostLikedEvent(postId, newLikesCount, userId, false));
            
            return false;
        } else {
            // Like non esisteva, proviamo ad aggiungerlo
            try {
                Like like = Like.builder()
                        .user(user)
                        .post(post)
                        .build();

                likeRepository.save(like);
                postRepository.updateLikesCount(postId, 1);

                // Crea notifica per autore post (solo se non è lo stesso utente)
                if (!post.getUser().getId().equals(userId)) {
                    notificationService.creaNotificaLike(
                            post.getUser().getId(),
                            userId,
                            postId
                    );
                }

                log.info("Like aggiunto - Post ID: {}, Utente: {}", postId, user.getUsername());
                
                // Pubblica evento per broadcast real-time
                int newLikesCount = post.getLikesCount() + 1;
                eventPublisher.publishEvent(new PostLikedEvent(postId, newLikesCount, userId, true));
                
                return true;

            } catch (DataIntegrityViolationException e) {
                // Race condition: un altro thread ha appena aggiunto il like
                // Il like è già presente (constraint violation su UNIQUE user_id, post_id)
                log.debug("Like già presente (race condition gestita) - Post ID: {}, Utente ID: {}",
                        postId, userId);
                return true; // Consideriamo il like come aggiunto
            }
        }
    }

    /**
     * Verifica se un utente ha messo like a un post.
     * <p>
     * Questo metodo è utile per il frontend per sapere se mostrare
     * il cuore pieno o vuoto.
     *
     * @param postId L'ID del post
     * @param userId L'ID dell'utente
     * @return true se l'utente ha messo like, false altrimenti
     */
    @Transactional(readOnly = true)
    public boolean hasMessoLike(Long postId, Long userId) {
        return likeRepository.existsByUserIdAndPostId(userId, postId);
    }

    /**
     * Ottiene la lista degli utenti che hanno messo like a un post.
     * <p>
     * Restituisce una lista paginata di utenti per gestire post con molti like.
     * Gli utenti sono ordinati per data del like: chi ha messo like più
     * recentemente appare per primo.
     *
     * @param postId   L'ID del post
     * @param pageable Parametri di paginazione
     * @return Page di UserSummaryDTO con gli utenti che hanno messo like
     * @throws ResourceNotFoundException se il post non esiste
     */
    @Transactional(readOnly = true)
    public Page<UserSummaryDTO> ottieniUtentiCheHannoMessoMiPiace(Long postId, Pageable pageable) {
        log.debug("Caricamento utenti che hanno messo like - Post ID: {}", postId);

        // Verifica che il post esista
        if (!postRepository.existsById(postId)) {
            throw new ResourceNotFoundException(ENTITY_POST, FIELD_ID, postId);
        }

        // Ottiene gli utenti paginati
        Page<User> users = likeRepository.findUsersWhoLikedPostPaginated(postId, pageable);

        log.debug("Trovati {} utenti che hanno messo like al post ID: {}",
                users.getTotalElements(), postId);

        // Ottimizzazione: carica tutti gli utenti online in una singola query
        Set<Long> onlineUserIds = userMapper.getOnlineUserIds();
        return users.map(user -> userMapper.toUtenteSummaryDTO(user, onlineUserIds));
    }


    /**
     * Conta il numero totale di like di un post.
     * <p>
     * Utilizzato principalmente per verificare la coerenza dei dati o per
     * ricalcolare il contatore in caso di problemi.
     *
     * @param postId L'ID del post
     * @return Il numero di like
     */
    @Transactional(readOnly = true)
    public long contaLike(Long postId) {
        return likeRepository.countByPostId(postId);
    }

    /**
     * Rimuove tutti i like di un utente (per pulizia o cancellazione account).
     *
     * THREAD-SAFETY:
     * Questo metodo è ottimizzato per evitare race condition:
     * 1. Prima ottiene la lista dei post affetti
     * 2. Elimina tutti i like in una singola query bulk (atomica)
     * 3. Sincronizza i contatori atomicamente per ogni post
     *
     * Questo approccio evita il problema di iterare e cancellare uno alla volta,
     * che potrebbe causare inconsistenze se altri thread stanno modificando i like.
     *
     * @param userId L'ID dell'utente
     * @return Il numero di like eliminati
     */
    @Transactional
    public int eliminaTuttiLikeUtente(Long userId) {
        log.info("Eliminazione tutti i like dell'utente ID: {}", userId);

        // 1. Ottieni la lista dei post_id che verranno affetti
        List<Long> affectedPostIds = likeRepository.findPostIdsByUserId(userId);

        // 2. Elimina tutti i like in una singola operazione bulk atomica
        int count = likeRepository.deleteAllByUserId(userId);

        // 3. Sincronizza i contatori atomicamente per ogni post affetto
        for (Long postId : affectedPostIds) {
            postRepository.syncLikesCount(postId);
        }

        log.info("Eliminati {} like dell'utente ID: {} da {} post",
                count, userId, affectedPostIds.size());
        return count;
    }

    /**
     * Ricalcola il contatore dei like di un post.
     *
     * THREAD-SAFETY:
     * Usa una query atomica che conta e aggiorna in un'unica operazione.
     * Questo elimina completamente la race condition del pattern read-modify-write.
     *
     * Utile per correggere eventuali disallineamenti tra il campo likesCount
     * del post e il numero reale di record nella tabella likes.
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
    public int ricalcolaContatorePost(Long postId) {
        log.info("Ricalcolo contatore like per post ID: {}", postId);

        // Verifica che il post esista
        if (!postRepository.existsById(postId)) {
            throw new ResourceNotFoundException(ENTITY_POST, FIELD_ID, postId);
        }

        // Legge il valore vecchio solo per logging (prima della sincronizzazione)
        Post post = postRepository.findById(postId).orElseThrow();
        int oldCount = post.getLikesCount();

        // Sincronizza atomicamente il contatore con la count reale
        postRepository.syncLikesCount(postId);

        // Rilegge per ottenere il nuovo valore
        long countReale = likeRepository.countByPostId(postId);

        if (countReale != oldCount) {
            log.warn("Contatore like disallineato per post ID: {} - Vecchio: {}, Nuovo: {}",
                    postId, oldCount, countReale);
        }

        return (int) countReale;
    }

    /**
     * Elimina tutti i like di un post.
     * Viene chiamato quando un post viene eliminato.
     *
     * @param postId L'ID del post
     */
    @Transactional
    public void deleteAllLikesByPostId(Long postId) {
        log.info("Eliminazione di tutti i like per post ID: {}", postId);
        
        int deletedCount = likeRepository.deleteAllByPostId(postId);
        
        log.info("Eliminati {} like per post ID: {}", deletedCount, postId);
    }
}