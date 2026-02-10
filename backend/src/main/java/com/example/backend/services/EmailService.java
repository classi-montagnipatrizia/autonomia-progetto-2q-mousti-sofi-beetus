package com.example.backend.services;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

/**
 * Service per l'invio di email.
 * <p>
 * Gestisce l'invio di email tramite JavaMailSender.
 * Supporta:
 * - Email di reset password
 * - Email di benvenuto
 * - Email di conferma cambio password
 * <p>
 * IMPORTANTE: Questo service viene chiamato SOLO da EmailEventListener
 * che si occupa della gestione asincrona tramite @Async.
 * I metodi qui non sono @Async perché l'asincronicità è gestita
 * a livello di listener event-driven.
 * <p>
 * Questo approccio garantisce che:
 * - L'invio email non blocca mai le transazioni
 * - Gli errori SMTP non compromettono le operazioni principali
 * - Facile aggiungere retry logic o queue management a livello di listener
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class EmailService {

    private final JavaMailSender mailSender;

    @Value("${spring.mail.username:noreply@beetUs.com}")
    private String fromEmail;

    @Value("${app.frontend.url:https://beetus-frontend.vercel.app}")
    private String frontendUrl;

    /**
     * Invia email di reset password con il token.
     * <p>
     * L'email contiene un link al frontend con il token come parametro.
     * <p>
     * NOTA: Chiamato da EmailEventListener in modo asincrono.
     *
     * @param recipientEmail L'email del destinatario
     * @param username       L'username dell'utente
     * @param resetToken     Il token per il reset
     */
    public void sendPasswordResetEmail(String recipientEmail, String username, String resetToken) {
        log.info("Invio email reset password a: {}", recipientEmail);

        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(fromEmail);
            message.setTo(recipientEmail);
            message.setSubject("Reset Password - beetUs");

            String resetUrl = frontendUrl + "/auth/reset-password?token=" + resetToken;

            String emailBody = String.format("""
                Ciao %s,

                Hai richiesto il reset della tua password.

                Clicca sul link seguente per reimpostare la password:
                %s

                Il link è valido per 1 ora.

                Se non hai richiesto il reset della password, ignora questa email.
                La tua password rimarrà invariata.

                Cordiali saluti,
                Il developer di beetUs - MousTech.
                """, username, resetUrl);

            message.setText(emailBody);

            mailSender.send(message);
            log.info("Email reset password inviata con successo a: {} - con url:{}", recipientEmail,resetUrl);

        } catch (Exception e) {
            log.error("Errore invio email a {}: {}", recipientEmail, e.getMessage(), e);
            // Non si propaga l'errore per non bloccare il flusso
            // L'utente vedrà comunque il messaggio di successo
        }
    }

    /**
     * Invia email di benvenuto al nuovo utente registrato.
     * <p>
     * Email di cortesia inviata dopo la registrazione.
     * <p>
     * NOTA: Chiamato da EmailEventListener in modo asincrono.
     *
     * @param recipientEmail L'email del nuovo utente
     * @param username       L'username del nuovo utente
     */
    public void sendWelcomeEmail(String recipientEmail, String username) {
        log.info("Invio email di benvenuto a: {}", recipientEmail);

        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(fromEmail);
            message.setTo(recipientEmail);
            message.setSubject("Benvenuto su beetUs!");

            String emailBody = String.format("""
                Ciao %s!

                Benvenuto/a su beetUs!

                La tua registrazione è stata completata con successo.
                Ora puoi accedere e iniziare a interagire con la tua classe.

                Funzionalità disponibili:
                - Pubblica post con testo e immagini
                - Commenta e metti like ai post
                - Invia messaggi diretti
                - Ricevi notifiche in tempo reale
                - Menziona altri utenti con @username

                Buon divertimento!

                Il developer di beetUs - MousTech.
                """, username);

            message.setText(emailBody);

            mailSender.send(message);
            log.info("Email di benvenuto inviata con successo a: {}", recipientEmail);

        } catch (Exception e) {
            log.error("Errore invio email di benvenuto a {}: {}", recipientEmail, e.getMessage());
        }
    }

    /**
     * Invia email di conferma cambio password.
     * <p>
     * Notifica l'utente che la password è stata cambiata con successo.
     * <p>
     * NOTA: Chiamato da EmailEventListener in modo asincrono.
     *
     * @param recipientEmail L'email dell'utente
     * @param username       L'username dell'utente
     */
    public void sendPasswordChangedEmail(String recipientEmail, String username) {
        log.info("Invio email conferma cambio password a: {}", recipientEmail);

        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(fromEmail);
            message.setTo(recipientEmail);
            message.setSubject("Password Modificata - beetUs");

            String emailBody = String.format("""
                Ciao %s,

                La tua password è stata modificata con successo.

                Cordiali saluti,
                Il developer di beetUs - MousTech.
                """, username);

            message.setText(emailBody);

            mailSender.send(message);
            log.info("Email conferma cambio password inviata a: {}", recipientEmail);

        } catch (Exception e) {
            log.error("Errore invio email conferma password a {}: {}", recipientEmail, e.getMessage());
        }
    }

    /**
     * Invia email di verifica account.
     * <p>
     * Contiene il link per verificare l'email e attivare l'account.
     * <p>
     * NOTA: Chiamato da EmailEventListener in modo asincrono.
     *
     * @param recipientEmail L'email dell'utente
     * @param username       L'username dell'utente
     * @param verificationToken Il token di verifica
     */
    public void sendVerificationEmail(String recipientEmail, String username, String verificationToken) {
        log.info("Invio email di verifica a: {}", recipientEmail);

        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(fromEmail);
            message.setTo(recipientEmail);
            message.setSubject("Verifica il tuo account - beetUs");

            String verificationUrl = frontendUrl + "/auth/verify-email?token=" + verificationToken;

            String emailBody = String.format("""
                Ciao %s!

                Benvenuto/a su beetUs!

                Per completare la registrazione e attivare il tuo account,
                clicca sul link seguente:

                %s

                Il link è valido per 24 ore.

                Se non hai richiesto questa registrazione, puoi ignorare questa email.

                Cordiali saluti,
                Il developer di beetUs - MousTech.
                """, username, verificationUrl);

            message.setText(emailBody);

            mailSender.send(message);
            log.info("Email di verifica inviata con successo a: {} - con url:{}", recipientEmail, verificationUrl);

        } catch (Exception e) {
            log.error("Errore invio email di verifica a {}: {}", recipientEmail, e.getMessage(), e);
            // Non si propaga l'errore per non bloccare il flusso
        }
    }
}
