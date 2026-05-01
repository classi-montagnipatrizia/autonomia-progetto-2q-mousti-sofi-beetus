package com.example.backend.services;

import com.example.backend.models.PushSubscription;
import com.example.backend.models.User;
import com.example.backend.repositories.PushSubscriptionRepository;
import com.example.backend.repositories.UserRepository;
import tools.jackson.databind.ObjectMapper;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import nl.martijndwars.webpush.Notification;
import nl.martijndwars.webpush.PushService;
import org.apache.http.HttpResponse;
import org.bouncycastle.jce.provider.BouncyCastleProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.Security;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class PushNotificationService {

    private final PushSubscriptionRepository pushSubscriptionRepository;
    private final UserRepository userRepository;
    private final ObjectMapper objectMapper;

    @Value("${vapid.public-key}")
    private String vapidPublicKey;

    @Value("${vapid.private-key}")
    private String vapidPrivateKey;

    @Value("${vapid.subject}")
    private String vapidSubject;

    private PushService pushService;

    @PostConstruct
    public void init() {
        if (vapidPublicKey == null || vapidPublicKey.isBlank()
                || vapidPrivateKey == null || vapidPrivateKey.isBlank()) {
            log.warn("Chiavi VAPID non configurate — push notifications disabilitate");
            return;
        }
        try {
            Security.addProvider(new BouncyCastleProvider());
            this.pushService = new PushService(vapidPublicKey, vapidPrivateKey, vapidSubject);
            log.info("PushNotificationService inizializzato con VAPID");
        } catch (Exception e) {
            log.error("Errore inizializzazione PushService: {}", e.getMessage(), e);
        }
    }

    /**
     * Salva la subscription del browser. Se l'endpoint esiste già, non fa nulla (idempotente).
     */
    @Transactional
    public void subscribe(Long userId, String endpoint, String p256dh, String auth) {
        pushSubscriptionRepository.findByEndpoint(endpoint).ifPresentOrElse(
            existing -> log.debug("Subscription già presente per endpoint: {}", endpoint),
            () -> {
                User user = userRepository.getReferenceById(userId);
                PushSubscription sub = PushSubscription.builder()
                        .user(user)
                        .endpoint(endpoint)
                        .p256dh(p256dh)
                        .auth(auth)
                        .build();
                pushSubscriptionRepository.save(sub);
                log.info("Nuova push subscription salvata per utente {}", userId);
            }
        );
    }

    /**
     * Rimuove la subscription del browser.
     */
    @Transactional
    public void unsubscribe(String endpoint) {
        pushSubscriptionRepository.deleteByEndpoint(endpoint);
        log.info("Push subscription rimossa per endpoint: {}", endpoint);
    }

    /**
     * Invia una push notification a tutti i dispositivi di un utente.
     * Operazione best-effort: gli errori vengono loggati ma non rilanciano eccezioni.
     * Le subscription scadute (HTTP 410) vengono rimosse automaticamente.
     */
    @Async
    public void sendToUser(Long userId, String title, String body, String url) {
        if (pushService == null) {
            return; // VAPID non configurato
        }

        User user = userRepository.getReferenceById(userId);
        List<PushSubscription> subscriptions = pushSubscriptionRepository.findByUser(user);

        if (subscriptions.isEmpty()) {
            return;
        }

        byte[] payload;
        try {
            String safeUrl = (url != null && !url.isBlank()) ? url : "/";
            // Formato richiesto da ngsw-worker.js di Angular.
            // badge omesso: richiede icona monocromatica su sfondo trasparente.
            // onActionClick.default: dice ad Angular SW di aprire/focalizzare la URL al click.
            payload = objectMapper.writeValueAsBytes(Map.of(
                    "notification", Map.of(
                            "title", title,
                            "body", body,
                            "icon", "/icons/icon-192x192.png",
                            "data", Map.of(
                                    "url", safeUrl,
                                    "onActionClick", Map.of(
                                            "default", Map.of(
                                                    "operation", "navigateLastFocusedOrOpen",
                                                    "url", safeUrl
                                            )
                                    )
                            )
                    )
            ));
        } catch (Exception e) {
            log.error("Errore serializzazione payload push: {}", e.getMessage());
            return;
        }

        for (PushSubscription sub : subscriptions) {
            sendSingle(sub, payload);
        }
    }

    private void sendSingle(PushSubscription sub, byte[] payload) {
        try {
            Notification notification = new Notification(sub.getEndpoint(), sub.getP256dh(), sub.getAuth(), payload);
            HttpResponse response = pushService.send(notification);
            int statusCode = response.getStatusLine().getStatusCode();

            if (statusCode == 410) {
                // Il browser ha revocato la subscription
                pushSubscriptionRepository.deleteByEndpoint(sub.getEndpoint());
                log.info("Push subscription scaduta rimossa (410): {}", sub.getEndpoint());
            } else if (statusCode >= 400) {
                log.warn("Errore invio push (HTTP {}): {}", statusCode, sub.getEndpoint());
            } else {
                log.debug("Push inviata con successo a utente {}", sub.getUser().getId());
            }
        } catch (Exception e) {
            log.error("Eccezione invio push a {}: {}", sub.getEndpoint(), e.getMessage());
        }
    }
}
