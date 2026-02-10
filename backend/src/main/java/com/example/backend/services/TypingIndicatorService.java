package com.example.backend.services;

import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Servizio per gestire gli indicatori di digitazione in tempo reale.
 * Utilizza una cache in-memory per tracciare chi sta scrivendo a chi.
 */
@Service
@Slf4j
public class TypingIndicatorService {

    // Mappa: "senderId:receiverId" -> timestamp ultimo typing
    private final Map<String, LocalDateTime> typingStatus = new ConcurrentHashMap<>();

    // Durata validità typing indicator (3 secondi)
    private static final int TYPING_TIMEOUT_SECONDS = 3;

    /**
     * Segnala che un utente sta scrivendo a un altro
     */
    public void setTyping(Long senderId, Long receiverId) {
        String key = createKey(senderId, receiverId);
        typingStatus.put(key, LocalDateTime.now());
        log.debug("Utente {} sta scrivendo a {}", senderId, receiverId);
    }

    /**
     * Rimuove l'indicatore di typing
     */
    public void clearTyping(Long senderId, Long receiverId) {
        String key = createKey(senderId, receiverId);
        typingStatus.remove(key);
        log.debug("Utente {} ha smesso di scrivere a {}", senderId, receiverId);
    }

    /**
     * Verifica se un utente sta scrivendo a un altro
     */
    public boolean isTyping(Long senderId, Long receiverId) {
        String key = createKey(senderId, receiverId);
        LocalDateTime lastTyping = typingStatus.get(key);
        
        if (lastTyping == null) {
            return false;
        }

        // Verifica se il typing è ancora valido (entro TYPING_TIMEOUT_SECONDS)
        boolean isActive = lastTyping.isAfter(
            LocalDateTime.now().minusSeconds(TYPING_TIMEOUT_SECONDS)
        );

        // Se scaduto, rimuovi dalla mappa
        if (!isActive) {
            typingStatus.remove(key);
        }

        return isActive;
    }

    /**
     * Crea chiave univoca per la relazione typing
     */
    private String createKey(Long senderId, Long receiverId) {
        return senderId + ":" + receiverId;
    }

    /**
     * Pulizia periodica dei typing scaduti (ogni 10 secondi)
     */
    @Scheduled(fixedRate = 10000)
    public void cleanupExpiredTyping() {
        LocalDateTime threshold = LocalDateTime.now().minusSeconds(TYPING_TIMEOUT_SECONDS);
        
        typingStatus.entrySet().removeIf(entry -> entry.getValue().isBefore(threshold));
    }
}
