package com.example.backend.services;

import com.example.backend.dtos.request.AggiornaProfiloRequestDTO;
import com.example.backend.dtos.response.UserResponseDTO;
import com.example.backend.dtos.response.UserSummaryDTO;
import com.example.backend.events.PasswordChangedEmailEvent;
import com.example.backend.exception.InvalidInputException;
import com.example.backend.exception.ResourceNotFoundException;
import com.example.backend.mappers.UserMapper;
import com.example.backend.models.User;
import com.example.backend.repositories.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Service per la gestione degli utenti.
 * <p>
 * Gestisce operazioni CRUD, ricerca, statistiche e sicurezza degli account
 * utente.
 * Include funzionalità per:
 * - Profili utente (visualizzazione, modifica)
 * - Gestione password
 * - Ricerca e suggerimenti
 * - Statistiche attività
 * - Attivazione/disattivazione account
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class UserService {

    private final UserRepository userRepository;
    private final PostRepository postRepository;
    private final CommentRepository commentRepository;

    private final UserMapper userMapper;
    private final PasswordEncoder passwordEncoder;
    private final ApplicationEventPublisher eventPublisher;

    // Costanti per messaggi di errore standardizzati
    private static final String ENTITY_USER = "Utente";
    private static final String FIELD_ID = "id";
    private static final int MAX_PROFILE_PICTURE_URL_LENGTH = 2048;

    /**
     * Ottiene il profilo completo dell'utente corrente.
     * Include tutte le informazioni personali dell'utente autenticato.
     *
     * @param userId ID dell'utente autenticato
     * @return DTO con i dati completi del profilo
     * @throws ResourceNotFoundException se l'utente non esiste
     */
    @Transactional(readOnly = true)
    public UserResponseDTO ottieniProfiloProprio(Long userId) {
        log.debug("Caricamento profilo proprio - Utente ID: {}", userId);

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException(ENTITY_USER, FIELD_ID, userId));

        return userMapper.toUtenteResponseDTO(user);
    }

    /**
     * Ottiene il profilo pubblico di un altro utente.
     * Verifica che l'account sia attivo prima di restituire i dati.
     *
     * @param userId ID dell'utente da visualizzare
     * @return DTO con i dati pubblici del profilo
     * @throws ResourceNotFoundException se l'utente non esiste o è disattivato
     */
    @Transactional(readOnly = true)
    public UserResponseDTO ottieniProfiloUtente(Long userId) {
        log.debug("Caricamento profilo pubblico - Utente ID: {}", userId);

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException(ENTITY_USER, FIELD_ID, userId));

        // Nasconde profili disattivati agli altri utenti
        if (!user.getIsActive().booleanValue()) {
            throw new ResourceNotFoundException(ENTITY_USER, FIELD_ID, userId);
        }

        return userMapper.toUtenteResponseDTO(user);
    }

    /**
     * Aggiorna il profilo dell'utente corrente.
     * Modifica solo i campi forniti nella richiesta (partial update).
     *
     * @param userId  ID dell'utente da aggiornare
     * @param request DTO con i campi da modificare
     * @return DTO con i dati aggiornati
     * @throws ResourceNotFoundException se l'utente non esiste
     */
    @Transactional
    public UserResponseDTO aggiornaProfilo(Long userId, AggiornaProfiloRequestDTO request) {
        log.info("Aggiornamento profilo - Utente ID: {}", userId);

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException(ENTITY_USER, FIELD_ID, userId));

        // Aggiorna nome completo se fornito
        if (request.getNomeCompleto() != null && !request.getNomeCompleto().isBlank()) {
            user.setFullName(request.getNomeCompleto().trim());
        }

        // Aggiorna bio se fornita
        if (request.getBio() != null) {
            user.setBio(request.getBio().trim());
        }

        // Aggiorna URL immagine profilo se fornito
        if (request.getProfilePictureUrl() != null) {
            String trimmedUrl = request.getProfilePictureUrl().trim();
            if (trimmedUrl.length() > MAX_PROFILE_PICTURE_URL_LENGTH) {
                throw new InvalidInputException("L'URL dell'immagine profilo è troppo lungo");
            }
            user.setProfilePictureUrl(trimmedUrl);
        }

        user = userRepository.save(user);
        log.info("Profilo aggiornato - Utente: {}", user.getUsername());

        return userMapper.toUtenteResponseDTO(user);
    }

    /**
     * Cambia la password dell'utente.
     * Richiede la password attuale per motivi di sicurezza.
     *
     * @param userId          ID dell'utente
     * @param vecchiaPassword password attuale per verifica
     * @param nuovaPassword   nuova password (min 6 caratteri)
     * @throws ResourceNotFoundException se l'utente non esiste
     * @throws InvalidInputException     se la vecchia password è errata o la nuova
     *                                   non è valida
     */
    @Transactional
    public void cambiaPassword(Long userId, String vecchiaPassword, String nuovaPassword) {
        log.info("Cambio password - Utente ID: {}", userId);

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException(ENTITY_USER, FIELD_ID, userId));

        // Verifica che la password attuale sia corretta
        if (!passwordEncoder.matches(vecchiaPassword, user.getPasswordHash())) {
            log.warn("Tentativo di cambio password fallito - Password vecchia errata");
            throw new InvalidInputException("La password attuale non è corretta");
        }

        // Valida requisiti nuova password
        if (nuovaPassword == null || nuovaPassword.length() < 6) {
            throw new InvalidInputException("La nuova password deve essere di almeno 6 caratteri");
        }

        // Codifica e salva la nuova password
        user.setPasswordHash(passwordEncoder.encode(nuovaPassword));
        userRepository.save(user);

        // Pubblica evento per invio email di conferma asincrona
        eventPublisher.publishEvent(new PasswordChangedEmailEvent(user.getEmail(), user.getUsername()));
        log.debug("Evento PasswordChangedEmailEvent pubblicato per utente: {}", user.getUsername());

        log.info("Password cambiata con successo - Utente: {}", user.getUsername());
    }

    /**
     * Cerca utenti per username o nome completo.
     * Filtra solo i compagni della stessa classe dell'utente corrente.
     *
     * @param searchTerm termine di ricerca (username o nome)
     * @param currentUserId ID dell'utente che effettua la ricerca
     * @param pageable   parametri di paginazione
     * @return pagina di utenti trovati nella stessa classe
     * @throws InvalidInputException se il termine di ricerca è vuoto
     */
    @Transactional(readOnly = true)
    public Page<UserSummaryDTO> cercaUtenti(String searchTerm, Long currentUserId, Pageable pageable) {
        log.debug("Ricerca utenti - Termine: {}, Utente: {}", searchTerm, currentUserId);

        if (searchTerm == null || searchTerm.trim().isEmpty()) {
            throw new InvalidInputException("Il termine di ricerca non può essere vuoto");
        }

        // Recupera la classe dell'utente corrente
        User currentUser = userRepository.findById(currentUserId)
                .orElseThrow(() -> new ResourceNotFoundException(ENTITY_USER, FIELD_ID, currentUserId));

        String classroom = currentUser.getClassroom();

        Page<User> users;
        if (classroom != null && !classroom.isEmpty()) {
            // Filtra per classe
            users = userRepository.searchUsersByClassroom(searchTerm.trim(), classroom, pageable);
        } else {
            // Fallback: se l'utente non ha classe, cerca tutti (per retrocompatibilità)
            users = userRepository.searchUsers(searchTerm.trim(), pageable);
        }

        log.debug("Trovati {} utenti con termine '{}' nella classe '{}'", users.getTotalElements(), searchTerm, classroom);

        // Ottimizzazione: carica tutti gli utenti online in una singola query
        Set<Long> onlineUserIds = userMapper.getOnlineUserIds();
        return users.map(user -> userMapper.toUtenteSummaryDTO(user, onlineUserIds));
    }

    /**
     * Ottiene tutti gli utenti attivi della stessa classe dell'utente corrente.
     * Filtra per classroom per garantire isolamento tra classi.
     *
     * @param currentUserId ID dell'utente che effettua la richiesta
     * @param pageable parametri di paginazione
     * @return pagina di utenti attivi della stessa classe
     */
    @Transactional(readOnly = true)
    public Page<UserSummaryDTO> ottieniTuttiUtenti(Long currentUserId, Pageable pageable) {
        log.debug("Caricamento utenti della stessa classe - Utente ID: {}", currentUserId);

        // Recupera la classe dell'utente corrente
        User currentUser = userRepository.findById(currentUserId)
                .orElseThrow(() -> new ResourceNotFoundException(ENTITY_USER, FIELD_ID, currentUserId));

        String classroom = currentUser.getClassroom();

        Page<User> users;
        if (classroom != null && !classroom.isEmpty()) {
            // Filtra per classe
            users = userRepository.findAllActiveUsersByClassroom(classroom, pageable);
        } else {
            // Fallback: se l'utente non ha classe, mostra tutti (per retrocompatibilità)
            users = userRepository.findAllActiveUsers(pageable);
        }

        // Ottimizzazione: carica tutti gli utenti online in una singola query
        Set<Long> onlineUserIds = userMapper.getOnlineUserIds();
        return users.map(user -> userMapper.toUtenteSummaryDTO(user, onlineUserIds));
    }

    /**
     * Calcola statistiche complete dell'attività utente.
     * Include conteggi di:
     * - Post pubblicati
     * - Commenti scritti
     * - Like ricevuti sui propri post
     * - Totale interazioni (post + commenti)
     *
     * @param userId ID dell'utente
     * @return mappa con le statistiche
     * @throws ResourceNotFoundException se l'utente non esiste
     */
    @Transactional(readOnly = true)
    public Map<String, Object> ottieniStatistiche(Long userId) {
        log.debug("Caricamento statistiche - Utente ID: {}", userId);

        // Verifica esistenza utente
        if (!userRepository.existsById(userId)) {
            throw new ResourceNotFoundException(ENTITY_USER, FIELD_ID, userId);
        }

        // Conta post pubblicati dall'utente
        long postsCount = postRepository.countByUserId(userId);

        // Conta commenti scritti dall'utente
        long commentsCount = commentRepository.countByUserId(userId);

        // Conta like ricevuti su tutti i post dell'utente
        Long likesReceived = userRepository.countTotalLikesReceivedByUserId(userId);
        if (likesReceived == null) {
            likesReceived = 0L;
        }

        // Costruisce mappa statistiche
        Map<String, Object> stats = new HashMap<>();
        stats.put("postsCount", postsCount);
        stats.put("commentsCount", commentsCount);
        stats.put("likesReceivedCount", likesReceived);
        stats.put("totalInteractions", postsCount + commentsCount);

        return stats;
    }

    /**
     * Verifica se uno username è disponibile.
     * Utilizzato per validazione in tempo reale durante la registrazione.
     *
     * @param username username da verificare
     * @return true se disponibile, false se già in uso
     */
    @Transactional(readOnly = true)
    public boolean verificaUsernameDisponibile(String username) {
        return !userRepository.existsByUsername(username);
    }

    /**
     * Verifica se un'email è disponibile.
     * Utilizzato per validazione in tempo reale durante la registrazione.
     *
     * @param email email da verificare
     * @return true se disponibile, false se già in uso
     */
    @Transactional(readOnly = true)
    public boolean verificaEmailDisponibile(String email) {
        return !userRepository.existsByEmail(email);
    }

    /**
     * Aggiorna il timestamp dell'ultimo accesso dell'utente.
     * Chiamato automaticamente ad ogni login per tracking attività.
     *
     * @param userId ID dell'utente
     * @throws ResourceNotFoundException se l'utente non esiste
     */
    @Transactional
    public void aggiornaUltimoAccesso(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException(ENTITY_USER, FIELD_ID, userId));

        user.setLastSeen(LocalDateTime.now());
        userRepository.save(user);
    }

    /**
     * Disattiva un account utente (soft delete).
     * L'account rimane nel database ma diventa invisibile e inaccessibile.
     * Richiede la password per conferma e impedisce la disattivazione di admin.
     *
     * @param userId   ID dell'utente
     * @param password password dell'utente per conferma
     * @throws ResourceNotFoundException se l'utente non esiste
     * @throws InvalidInputException     se password errata o tentativo di
     *                                   disattivare admin
     */
    @Transactional
    public void disattivaAccount(Long userId, String password) {
        log.info("Disattivazione account - Utente ID: {}", userId);

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException(ENTITY_USER, FIELD_ID, userId));

        // Verifica password per sicurezza
        if (!passwordEncoder.matches(password, user.getPasswordHash())) {
            throw new InvalidInputException("Password non corretta");
        }

        // Protegge account amministratore
        if (user.getIsAdmin().booleanValue()) {
            throw new InvalidInputException("Non è possibile disattivare un account admin");
        }

        user.setIsActive(false);
        userRepository.save(user);

        log.info("Account disattivato - Username: {}", user.getUsername());
    }

    /**
     * Riattiva un account utente precedentemente disattivato.
     * L'utente può tornare ad accedere e utilizzare la piattaforma.
     *
     * @param userId ID dell'utente da riattivare
     * @throws ResourceNotFoundException se l'utente non esiste
     */
    @Transactional
    public void riattivaAccount(Long userId) {
        log.info("Riattivazione account - Utente ID: {}", userId);

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException(ENTITY_USER, FIELD_ID, userId));

        user.setIsActive(true);
        userRepository.save(user);

        log.info("Account riattivato - Username: {}", user.getUsername());
    }

    /**
     * Ottiene suggerimenti di username per funzionalità di menzioni.
     * Cerca username che iniziano con il prefisso fornito (autocomplete).
     * Limita i risultati a 10 per prestazioni.
     *
     * @param prefix prefisso username (es: "@gio")
     * @return lista di utenti suggeriti (max 10)
     */
    /**
     * Ottiene suggerimenti per menzioni basati su un prefisso username.
     * <p>
     * Utilizzato per l'autocomplete quando si digita @ nel contenuto.
     * <p>
     * PERFORMANCE: Usa Pageable per limitare i risultati direttamente nel DB (LIMIT
     * 10)
     * invece di caricare tutti gli utenti e poi limitare in Java.
     *
     * 
     * @param prefix Il prefisso dello username da cercare
     * @return Lista di max 10 suggerimenti
     */
    @Transactional(readOnly = true)
    public List<UserSummaryDTO> getSuggerimentiMenzioni(String prefix) {
        log.debug("Suggerimenti menzioni - Prefix: {}", prefix);

        if (prefix == null || prefix.trim().isEmpty()) {
            return List.of();
        }

        // Query ottimizzata: limita a 10 risultati direttamente nel DB
        Pageable limit10 = PageRequest.of(0, 10);
        List<User> users = userRepository.findByUsernameStartingWith(prefix.trim(), limit10);

        // Ottimizzazione: usa il metodo batch
        return userMapper.toUtenteSummaryDTOList(users);
    }

    /**
     * Conta tutti gli utenti registrati nella piattaforma.
     * Include utenti attivi e disattivati. Uso riservato all' admin.
     *
     * @return numero totale di utenti
     */
    @Transactional(readOnly = true)
    public long contaTuttiUtenti() {
        return userRepository.count();
    }

    /**
     * Conta solo gli utenti con account attivo.
     * Esclude utenti disattivati.
     *
     * PERFORMANCE: Usa COUNT query invece di caricare tutti gli utenti.
     *
     * @return numero di utenti attivi
     */
    @Transactional(readOnly = true)
    public long contaUtentiAttivi() {
        return userRepository.countByIsActiveTrue();
    }

    /**
     * Ottiene l'utente amministratore della piattaforma.
     * 
     * @return DTO con i dati dell'admin
     * @throws ResourceNotFoundException se nessun admin è configurato
     */
    @Transactional(readOnly = true)
    public UserResponseDTO ottieniAdmin() {
        User admin = userRepository.findByIsAdminTrue()
                .orElseThrow(() -> new ResourceNotFoundException("Admin non trovato"));

        return userMapper.toUtenteResponseDTO(admin);
    }
}
