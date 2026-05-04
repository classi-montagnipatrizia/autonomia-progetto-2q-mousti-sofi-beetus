package com.example.backend.config;

import com.example.backend.models.User;
import com.example.backend.repositories.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class DataInitializer implements CommandLineRunner {

    @Value("${ADMIN_PASSWORD}")
    private String adminPassword;

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    public void run(String... args) {
        if (!userRepository.findByIsAdminTrue().isEmpty()) {
            log.info("Admin già presente, nessun inserimento eseguito.");
            return;
        }

        User admin = User.builder()
                .username("moustapha.mbaye")
                .email("moustapha.mbaye@marconirovereto.it")
                .passwordHash(passwordEncoder.encode(adminPassword))
                .fullName("Moustapha Mbaye")
                .classroom(null)
                .isAdmin(true)
                .isActive(true)
                .build();

        userRepository.save(admin);
        log.info("Admin creato all'avvio.");
    }
}
