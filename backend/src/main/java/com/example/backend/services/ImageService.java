package com.example.backend.services;

import com.cloudinary.Cloudinary;
import com.cloudinary.utils.ObjectUtils;
import com.example.backend.exception.CloudinaryException;
import com.example.backend.exception.InvalidInputException;
import com.example.backend.exception.ResourceNotFoundException;
import com.example.backend.exception.UnauthorizedException;
import com.example.backend.models.Post;
import com.example.backend.models.User;
import com.example.backend.repositories.PostRepository;
import com.example.backend.repositories.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Service per la gestione delle immagini tramite Cloudinary.
 * <p>
 * Gestisce:
 * - Eliminazione sicura delle immagini
 * - Verifica della proprietà delle immagini
 * - Integrazione con Cloudinary Admin API
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class ImageService {

    private final Cloudinary cloudinary;
    private final PostRepository postRepository;
    private final UserRepository userRepository;

    // Pattern per estrarre il publicId dall'URL Cloudinary
    // Esempio: https://res.cloudinary.com/demo/image/upload/v1234567/folder/image.jpg
    // Public ID: folder/image
    private static final Pattern PUBLIC_ID_PATTERN =
        Pattern.compile("/upload/(?:v\\d+/)?(.+?)(?:\\.[a-z]+)?$");

    /**
     * Elimina un'immagine da Cloudinary dopo aver verificato la proprietà dell'utente.
     * <p>
     * Flusso:
     * 1. Estrae il publicId dall'URL
     * 2. Verifica che l'utente possieda l'immagine
     * 3. Elimina da Cloudinary
     * 4. Rimuove il riferimento dal database
     *
     * @param imageUrl URL completo dell'immagine Cloudinary
     * @param userId ID dell'utente che richiede l'eliminazione
     * @throws InvalidInputException se l'URL non è valido
     * @throws UnauthorizedException se l'utente non è proprietario
     * @throws ResourceNotFoundException se l'immagine non esiste
     */
    @Transactional
    public void deleteImage(String imageUrl, Long userId) {
        log.info("Richiesta eliminazione immagine - URL: {}, User ID: {}", imageUrl, userId);

        // Estrai publicId dall'URL
        String publicId = extractPublicIdFromUrl(imageUrl);
        log.debug("Public ID estratto: {}", publicId);

        // Verifica proprietà
        verifyImageOwnership(imageUrl, userId);

        // Elimina da Cloudinary
         try {
            @SuppressWarnings("unchecked")
            Map<String, Object> result = cloudinary.uploader().destroy(publicId, ObjectUtils.emptyMap());
            String resultStatus = (String) result.get("result");

            if (!"ok".equals(resultStatus) && !"not found".equals(resultStatus)) {
                log.error("Errore eliminazione Cloudinary - Result: {}", result);
                throw new CloudinaryException("Errore durante l'eliminazione dell'immagine da Cloudinary");
            }

            log.info("Immagine eliminata da Cloudinary - Public ID: {}, Result: {}", publicId, resultStatus);
        } catch (CloudinaryException e) {
            throw e;
        } catch (Exception e) {
            log.error("Eccezione durante eliminazione da Cloudinary", e);
            throw new CloudinaryException("Errore durante l'eliminazione dell'immagine: " + e.getMessage(), e);
        }

        // Rimuovi riferimento dal database
        removeImageReference(imageUrl);
    }

    /**
     * Estrae il publicId da un URL Cloudinary.
     * <p>
     * Esempio:
     * Input:  https://res.cloudinary.com/demo/image/upload/v1234567/class_connect/posts/123_abc.jpg
     * Output: class_connect/posts/123_abc
     *
     * @param imageUrl URL completo Cloudinary
     * @return publicId estratto
     * @throws InvalidInputException se l'URL non è valido
     */
    private String extractPublicIdFromUrl(String imageUrl) {
        if (imageUrl == null || imageUrl.isBlank()) {
            throw new InvalidInputException("URL immagine non valido");
        }

        Matcher matcher = PUBLIC_ID_PATTERN.matcher(imageUrl);
        if (!matcher.find()) {
            throw new InvalidInputException("URL Cloudinary non valido: impossibile estrarre il public ID");
        }

        return matcher.group(1);
    }

    /**
     * Verifica che l'utente sia proprietario dell'immagine.
     * <p>
     * Controlla se l'immagine appartiene a:
     * - Un post dell'utente
     * - Una foto profilo dell'utente (attuale o vecchia)
     * <p>
     * Per le foto profilo, permette l'eliminazione anche se l'URL
     * non è più presente nel database (es. foto sostituita).
     * La verifica avviene controllando che l'immagine sia nella
     * cartella profiles e che l'utente esista.
     *
     * @param imageUrl URL dell'immagine
     * @param userId ID dell'utente
     * @throws UnauthorizedException se l'utente non è proprietario
     */
    private void verifyImageOwnership(String imageUrl, Long userId) {
        // Verifica se è un'immagine di un post
        boolean isPostImage = postRepository.existsByImageUrlAndUserId(imageUrl, userId);
        if (isPostImage) {
            log.debug("Immagine trovata in post dell'utente {}", userId);
            return;
        }

        // Verifica se è l'immagine del profilo corrente
        boolean isProfileImage = userRepository.existsByIdAndProfilePictureUrl(userId, imageUrl);
        if (isProfileImage) {
            log.debug("Immagine è la foto profilo attuale dell'utente {}", userId);
            return;
        }

        // Per le foto profilo vecchie (già sostituite), verifica che:
        // 1. L'immagine sia nella cartella profiles
        // 2. L'utente esista nel database
        String publicId = extractPublicIdFromUrl(imageUrl);
        if (publicId.startsWith("classconnect/profiles/")) {
            boolean userExists = userRepository.existsById(userId);
            if (userExists) {
                log.debug("Immagine profilo (anche vecchia) - User {} esiste, eliminazione consentita", userId);
                return;
            }
        }

        // L'immagine non appartiene all'utente
        log.warn("Tentativo non autorizzato di eliminazione immagine - User: {}, URL: {}", userId, imageUrl);
        throw new UnauthorizedException("Non sei autorizzato a eliminare questa immagine");
    }

    /**
     * Rimuove il riferimento all'immagine dal database.
     * <p>
     * Imposta a null il campo imageUrl/profilePictureUrl nel database.
     *
     * @param imageUrl URL dell'immagine da rimuovere
     */
    private void removeImageReference(String imageUrl) {
        // Rimuovi da Post se esiste
        Post post = postRepository.findByImageUrl(imageUrl).orElse(null);
        if (post != null) {
            post.setImageUrl(null);
            postRepository.save(post);
            log.debug("Riferimento immagine rimosso dal post ID: {}", post.getId());
            return;
        }

        // Rimuovi dal profilo User se esiste
        User user = userRepository.findByProfilePictureUrl(imageUrl).orElse(null);
        if (user != null) {
            user.setProfilePictureUrl(null);
            userRepository.save(user);
            log.debug("Riferimento immagine rimosso dal profilo utente ID: {}", user.getId());
        }
    }

    /**
     * Elimina un'immagine di un messaggio da Cloudinary.
     * Questa funzione è più permissiva: elimina l'immagine senza verificare la proprietà
     * perché la verifica è già stata fatta dal chiamante (DirectMessageService).
     *
     * @param imageUrl URL completo dell'immagine Cloudinary
     */
    public void deleteMessageImage(String imageUrl) {
        if (imageUrl == null || imageUrl.isBlank()) {
            return;
        }

        log.info("Eliminazione immagine messaggio - URL: {}", imageUrl);

        // Estrai publicId dall'URL
        String publicId = extractPublicIdFromUrl(imageUrl);
        log.debug("Public ID estratto: {}", publicId);

        // Elimina da Cloudinary
        try {
            @SuppressWarnings("unchecked")
            Map<String, Object> result = cloudinary.uploader().destroy(publicId, ObjectUtils.emptyMap());
            String resultStatus = (String) result.get("result");

            if (!"ok".equals(resultStatus) && !"not found".equals(resultStatus)) {
                log.error("Errore eliminazione Cloudinary - Result: {}", result);
                // Non lanciare eccezione, log solo l'errore
            } else {
                log.info("Immagine messaggio eliminata da Cloudinary - Public ID: {}, Result: {}", publicId, resultStatus);
            }
        } catch (Exception e) {
            log.error("Eccezione durante eliminazione immagine messaggio da Cloudinary", e);
            // Non lanciare eccezione, il messaggio può comunque essere eliminato
        }
    }
}