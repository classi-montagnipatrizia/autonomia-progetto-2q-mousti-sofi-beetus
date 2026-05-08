package com.example.backend.events;

import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public class VerificationEmailEvent {
    private final String email;
    private final String username;
    private final String verificationToken;
}
