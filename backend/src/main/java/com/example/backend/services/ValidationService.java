package com.example.backend.services;

import com.example.backend.config.AppConfigProperties;
import com.example.backend.exception.LimitExceededException;
import com.example.backend.repositories.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

/**
 * Servizio per validazioni dell'applicazione.
 * Centralizza controlli sui limiti e constraint di business.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class ValidationService {

    private final UserRepository userRepository;
    private final AppConfigProperties appConfig;

    /**
     * Valida che non sia stato raggiunto il limite massimo di studenti.
     * @throws LimitExceededException se il limite è raggiunto
     */
    public void validateStudentLimit() {
        long count = userRepository.count();
        int maxStudents = appConfig.getMaxStudents();
        
        if (count >= maxStudents) {
            log.warn("Tentativo di registrazione con limite studenti raggiunto: {}/{}", count, maxStudents);
            throw new LimitExceededException(
                String.format("Limite massimo di %d studenti raggiunto", maxStudents)
            );
        }
        
        log.debug("Validazione limite studenti OK: {}/{}", count, maxStudents);
    }
}
