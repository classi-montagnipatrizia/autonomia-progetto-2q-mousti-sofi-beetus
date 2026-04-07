package com.example.backend.controllers;

import com.example.backend.config.CurrentUser;
import com.example.backend.models.User;
import com.example.backend.services.PushNotificationService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/push")
@RequiredArgsConstructor
@Slf4j
public class PushController {

    private final PushNotificationService pushNotificationService;

    @PostMapping("/subscribe")
    public ResponseEntity<Void> subscribe(@CurrentUser User user,
                                          @Valid @RequestBody SubscribeRequest request) {
        pushNotificationService.subscribe(user.getId(), request.getEndpoint(),
                request.getP256dh(), request.getAuth());
        return ResponseEntity.ok().build();
    }

    @PostMapping("/unsubscribe")
    public ResponseEntity<Void> unsubscribe(@Valid @RequestBody UnsubscribeRequest request) {
        pushNotificationService.unsubscribe(request.getEndpoint());
        return ResponseEntity.ok().build();
    }

    @Data
    public static class SubscribeRequest {
        @NotBlank private String endpoint;
        @NotBlank private String p256dh;
        @NotBlank private String auth;
    }

    @Data
    public static class UnsubscribeRequest {
        @NotBlank private String endpoint;
    }
}
