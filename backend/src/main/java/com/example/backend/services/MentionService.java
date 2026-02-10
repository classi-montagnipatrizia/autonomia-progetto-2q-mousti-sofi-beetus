package com.example.backend.services;

import com.example.backend.dtos.response.MentionResponseDTO;
import com.example.backend.mappers.MentionMapper;
import com.example.backend.models.*;
import com.example.backend.repositories.*;
import lombok.extern.slf4j.Slf4j;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Lazy;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

/**
 * Service per la gestione delle menzioni (@username).
 * <p>
 * Gestisce tutte le operazioni relative alle menzioni:
 * - Rilevamento automatico delle menzioni nel testo
 * - Creazione delle menzioni nel database
 * - Invio notifiche agli utenti menzionati
 * - Recupero delle menzioni ricevute da un utente
 * - Eliminazione delle menzioni quando il contenuto viene cancellato
 * <p>

 */
@Service
@Slf4j
public class MentionService {

 private final MentionRepository mentionRepository;
    private final UserRepository userRepository;
    private final NotificationService notificationService;
    private final MentionMapper mentionMapper;
    
    // Field injection solo per self (auto-riferimento)
    @Lazy
    @Autowired
    private MentionService self;

    // Constructor injection per le altre dipendenze
    public MentionService(
            MentionRepository mentionRepository,
            UserRepository userRepository,
            NotificationService notificationService,
            MentionMapper mentionMapper) {
        this.mentionRepository = mentionRepository;
        this.userRepository = userRepository;
        this.notificationService = notificationService;
        this.mentionMapper = mentionMapper;
    }


    // Pattern regex per rilevare @username
    // Rileva @ seguito da caratteri alfanumerici, underscore e punto
    // Esempi validi: @mario, @mario_rossi, @mario.rossi, @mario123
    private static final Pattern MENTION_PATTERN = Pattern.compile("@([a-zA-Z0-9._]+)");

    /**
     * Estrae tutti gli username menzionati da un testo.
     * <p>
     * Cerca tutte le occorrenze di @username nel testo.
     * Ritorna solo username univoci (rimuove duplicati).
     *
     * @param content Il contenuto testuale da analizzare
     * @return Set di username menzionati (senza il carattere @)
     */
    public Set<String> estraiUsernames(String content) {
        if (content == null || content.isBlank()) {
            return Set.of();
        }

        Set<String> usernames = new HashSet<>();
        Matcher matcher = MENTION_PATTERN.matcher(content);

        while (matcher.find()) {
            String username = matcher.group(1); // Gruppo 1 = username senza @
            usernames.add(username.toLowerCase()); // Normalizza a lowercase
        }

        log.debug("Estratti {} username dal contenuto", usernames.size());
        return usernames;
    }

    /**
     * Processa le menzioni in un post.
     * <p>
     * 1. Estrae gli @username dal contenuto del post
     * 2. Verifica che gli username esistano nel database
     * 3. Crea le menzioni nel database
     * 4. Invia notifiche agli utenti menzionati
     *
     * @param postId L'ID del post
     * @param content Il contenuto del post
     * @param authorId L'ID dell'autore del post (chi fa la menzione)
     */
    @Transactional
    public void processaMenzioniPost(Long postId, String content, Long authorId) {
        log.debug("Processamento menzioni per post {}", postId);

        Set<String> usernames = estraiUsernames(content);
        if (usernames.isEmpty()) {
            return;
        }

        // Trova gli utenti menzionati che esistono
        List<User> mentionedUsers = userRepository.findByUsernameIn(usernames);

        for (User mentionedUser : mentionedUsers) {
            // Non creare menzione se l'autore menziona se stesso
            if (mentionedUser.getId().equals(authorId)) {
                continue;
            }

            // Verifica se la menzione esiste già
            boolean exists = mentionRepository.existsByMentionedUserIdAndMentionableTypeAndMentionableId(
                    mentionedUser.getId(), MentionableType.POST, postId);

            if (!exists) {
                // Crea la menzione
                Mention mention = Mention.builder()
                        .mentionedUser(mentionedUser)
                        .mentioningUser(userRepository.getReferenceById( authorId))
                        .mentionableType(MentionableType.POST)
                        .mentionableId(postId)
                        .build();

                mentionRepository.save(mention);

                // Crea notifica
                notificationService.creaNotificaMenzione(
                        mentionedUser.getId(),
                        authorId,
                        MentionableType.POST,
                        postId
                );

                log.info("Menzione creata: utente {} menzionato nel post {}",
                        mentionedUser.getUsername(), postId);
            }
        }
    }

    /**
     * Processa le menzioni in un commento.
     * <p>
     * Funzionamento analogo a processaMenzioniPost ma per i commenti.
     *
     * @param commentId L'ID del commento
     * @param content Il contenuto del commento
     * @param authorId L'ID dell'autore del commento
     */
    @Transactional
    public void processaMenzioniCommento(Long commentId, String content, Long authorId) {
        log.debug("Processamento menzioni per commento {}", commentId);

        Set<String> usernames = estraiUsernames(content);
        if (usernames.isEmpty()) {
            return;
        }

        List<User> mentionedUsers = userRepository.findByUsernameIn(usernames);

        for (User mentionedUser : mentionedUsers) {
            if (mentionedUser.getId().equals(authorId)) {
                continue;
            }

            boolean exists = mentionRepository.existsByMentionedUserIdAndMentionableTypeAndMentionableId(
                    mentionedUser.getId(), MentionableType.COMMENT, commentId);

            if (!exists) {
                Mention mention = Mention.builder()
                        .mentionedUser(mentionedUser)
                        .mentioningUser(userRepository.getReferenceById(authorId))
                        .mentionableType(MentionableType.COMMENT)
                        .mentionableId(commentId)
                        .build();

                mentionRepository.save(mention);

                notificationService.creaNotificaMenzione(
                        mentionedUser.getId(),
                        authorId,
                        MentionableType.COMMENT,
                        commentId
                );

                log.info("Menzione creata: utente {} menzionato nel commento {}",
                        mentionedUser.getUsername(), commentId);
            }
        }
    }


    /**
     * Aggiorna le menzioni quando un contenuto viene modificato.
     * <p>
     * Gestisce il caso in cui un utente modifica un post/commento:
     * 1. Elimina le vecchie menzioni
     * 2. Processa le nuove menzioni dal contenuto aggiornato
     * <p>
     * Questo evita menzioni "fantasma" e assicura che le menzioni
     * siano sempre allineate al contenuto corrente.
     *
     * @param type Il tipo di contenuto (POST o COMMENT)
     * @param contentId L'ID del contenuto
     * @param newContent Il nuovo contenuto
     * @param authorId L'ID dell'autore
     */
    @Transactional
    public void aggiornaMenzioni(MentionableType type, Long contentId,
                                  String newContent, Long authorId) {
        log.debug("Aggiornamento menzioni per {} {}", type, contentId);

        // Elimina le vecchie menzioni
        mentionRepository.deleteByMentionableTypeAndMentionableId(type, contentId);

        // Processa le nuove menzioni
        switch (type) {
            case POST -> self.processaMenzioniPost(contentId, newContent, authorId);
            case COMMENT ->self.processaMenzioniCommento(contentId, newContent, authorId);
        }

        log.info("Menzioni aggiornate per {} {}", type, contentId);
    }

    /**
     * Elimina tutte le menzioni associate a un contenuto.
     * <p>
     * Viene  chiamato quando un post o commento viene eliminato.
     *
     * @param type Il tipo di contenuto
     * @param contentId L'ID del contenuto
     */
    @Transactional
    public void eliminaMenzioni(MentionableType type, Long contentId) {
        log.debug("Eliminazione menzioni per {} {}", type, contentId);

        mentionRepository.deleteByMentionableTypeAndMentionableId(type, contentId);

        log.info("Menzioni eliminate per {} {}", type, contentId);
    }

    /**
     * Ottiene tutte le menzioni ricevute da un utente.
     * <p>
     * Ritorna tutte le volte che l'utente è stato menzionato
     * in post e commenti, ordinate dalla più recente.
     *
     * @param userId L'ID dell'utente
     * @return Lista di MentionResponseDTO
     */
    @Transactional(readOnly = true)
    public List<MentionResponseDTO> ottieniMenzioniUtente(Long userId) {
        log.debug("Caricamento menzioni per utente {}", userId);

        List<Mention> mentions = mentionRepository.findRecentMentionsWithUsers(userId);

        return mentions.stream()
                .map(mentionMapper::toMentionResponseDTO)
                .toList();
    }

    /**
     * Ottiene le ultime N menzioni ricevute da un utente.
     * <p>
     * Utile per mostrare un'anteprima delle menzioni recenti.
     *
     * @param userId L'ID dell'utente
     * @param limit Il numero massimo di menzioni da restituire
     * @return Lista delle ultime N menzioni
     */
    @Transactional(readOnly = true)
   public List<MentionResponseDTO> ottieniMenzioniRecenti(Long userId, int limit) {
    log.debug("Caricamento ultime {} menzioni per utente {}", limit, userId);

    Pageable pageable = PageRequest.of(0, limit);
    List<Mention> mentions = mentionRepository.findRecentMentionsWithUsers(userId, pageable);

    return mentions.stream()
            .map(mentionMapper::toMentionResponseDTO)
            .toList();
}

    /**
     * Verifica se un utente è stato menzionato in un contenuto specifico.
     * <p>
     * Utile per controlli di autorizzazione o per evidenziare
     * contenuti dove l'utente è stato menzionato.
     *
     * @param userId L'ID dell'utente
     * @param type Il tipo di contenuto
     * @param contentId L'ID del contenuto
     * @return true se l'utente è stato menzionato, false altrimenti
     */
    @Transactional(readOnly = true)
    public boolean isMenzionato(Long userId, MentionableType type, Long contentId) {
        return mentionRepository.existsByMentionedUserIdAndMentionableTypeAndMentionableId(
                userId, type, contentId);
    }

    /**
     * Conta il numero totale di menzioni ricevute da un utente.
     * <p>
     * Utile per statistiche utente.
     *
     * @param userId L'ID dell'utente
     * @return Il numero totale di menzioni
     */
    @Transactional(readOnly = true)
    public long contaMenzioni(Long userId) {
        return mentionRepository.findByMentionedUserIdOrderByCreatedAtDesc(userId).size();
    }

    /**
     * Ottiene gli utenti che hanno menzionato l'utente specificato.
     * <p>
     * Ritorna la lista di utenti che hanno fatto almeno una menzione,
     * utile per statistiche o per vedere chi ti menziona più spesso.
     *
     * @param userId L'ID dell'utente
     * @return Set di User che hanno menzionato l'utente
     */
    @Transactional(readOnly = true)
    public Set<User> ottieniUtentiCheMenzionano(Long userId) {
        List<Mention> mentions = mentionRepository.findRecentMentionsWithUsers(userId);

        return mentions.stream()
                .map(Mention::getMentioningUser)
                .collect(Collectors.toSet());
    }
}
