package com.example.backend.listeners;

import com.example.backend.events.PasswordChangedEmailEvent;
import com.example.backend.events.PasswordResetEmailEvent;
import com.example.backend.events.WelcomeEmailEvent;
import com.example.backend.services.EmailService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;

/**
 * Listener per gli eventi relativi all'invio di email.
 * <p>
 * Questo componente gestisce l'invio asincrono di email in risposta
 * agli eventi del sistema, disaccoppiando completamente la business logic
 * dall'infrastruttura di invio email.
 * <p>
 * Vantaggi dell'approccio event-driven:
 * - Le transazioni non vengono bloccate dall'invio email
 * - Errori SMTP non compromettono le operazioni principali
 * - Facile aggiungere retry logic o queue management
 * - Migliore testabilità (mock degli eventi)
 * <p>
 * Tutti i listener sono eseguiti in thread separati grazie a @Async,
 * utilizzando il thread pool configurato in AsyncConfig.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class EmailEventListener {

    private final EmailService emailService;

    /**
     * Gestisce l'invio dell'email di benvenuto quando un nuovo utente si registra.
     * <p>
     * Eseguito in modo asincrono per non bloccare la transazione di registrazione.
     * Se l'invio fallisce, viene loggato ma non influisce sulla registrazione.
     *
     * @param event L'evento contenente i dati del nuovo utente
     */
    @Async
    @EventListener
    public void handleWelcomeEmail(WelcomeEmailEvent event) {
        log.info("Evento WelcomeEmailEvent ricevuto per utente: {}", event.getUsername());

        try {
            emailService.sendWelcomeEmail(event.getEmail(), event.getUsername());
            log.info("Email di benvenuto processata per: {}", event.getUsername());
        } catch (Exception e) {
            // Log ma non propagare l'errore
            // L'utente è già registrato, l'email è "best effort"
            log.error("Errore invio email di benvenuto a {}: {}",
                    event.getEmail(), e.getMessage(), e);
        }
    }

    /**
     * Gestisce l'invio dell'email di conferma cambio password.
     * <p>
     * Importante per sicurezza: notifica l'utente di modifiche al suo account.
     * Eseguito in modo asincrono per non rallentare l'operazione di cambio password.
     *
     * @param event L'evento contenente i dati dell'utente
     */
    @Async
    @EventListener
    public void handlePasswordChangedEmail(PasswordChangedEmailEvent event) {
        log.info("Evento PasswordChangedEmailEvent ricevuto per utente: {}", event.getUsername());

        try {
            emailService.sendPasswordChangedEmail(event.getEmail(), event.getUsername());
            log.info("Email conferma cambio password processata per: {}", event.getUsername());
        } catch (Exception e) {
            log.error("Errore invio email conferma cambio password a {}: {}",
                    event.getEmail(), e.getMessage(), e);
        }
    }

    /**
     * Gestisce l'invio dell'email per il reset della password.
     * <p>
     * Contiene il token necessario per reimpostare la password.
     * Eseguito in modo asincrono per risposta immediata all'utente.
     *
     * @param event L'evento contenente email, username e token
     */
    @Async
    @EventListener
    public void handlePasswordResetEmail(PasswordResetEmailEvent event) {
        log.info("Evento PasswordResetEmailEvent ricevuto per utente: {}", event.getUsername());

        try {
            emailService.sendPasswordResetEmail(
                    event.getEmail(),
                    event.getUsername(),
                    event.getResetToken()
            );
            log.info("Email reset password processata per: {}", event.getUsername());
        } catch (Exception e) {
            log.error("Errore invio email reset password a {}: {}",
                    event.getEmail(), e.getMessage(), e);
        }
    }
}
