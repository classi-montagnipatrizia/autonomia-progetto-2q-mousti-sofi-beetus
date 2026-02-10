package com.example.backend.config;

import com.example.backend.models.User;
import com.example.backend.repositories.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;

@Component
@RequiredArgsConstructor
@Slf4j
public class DataInitializer implements CommandLineRunner {

    private static final String DEFAULT_PASSWORD = "Password123!";

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    public void run(String... args) {
        User admin = buildAdmin("admin", "Amministratore");

        List<User> studenti = List.of(
                buildStudente("studente01", "Luca Bianchi", "3A"),
                buildStudente("studente02", "Giulia Rossi", "5A"),
                buildStudente("studente03", "Marco Verdi", "3A"),
                buildStudente("studente04", "Sara Neri", "3A"),
                buildStudente("studente05", "Paolo Gallo", "4C"),
                buildStudente("studente06", "Chiara Riva", "3B"),
                buildStudente("studente07", "Matteo Costa", "5C"),
                buildStudente("studente08", "Elena Greco", "4A"),
                buildStudente("studente09", "Davide Fontana", "5A"),
                buildStudente("studente10", "Anna Marino", "4A")
        );

            List<User> daCreare = new ArrayList<>();

            if (userRepository.findByIsAdminTrue().isEmpty()
                && !userRepository.existsByUsername(admin.getUsername())
                && !userRepository.existsByEmail(admin.getEmail())) {
                daCreare.add(admin);
            }

            studenti.stream()
                .filter(user -> !userRepository.existsByUsername(user.getUsername()))
                .filter(user -> !userRepository.existsByEmail(user.getEmail()))
                .forEach(daCreare::add);

        if (daCreare.isEmpty()) {
            log.info("Dati demo già presenti, nessun inserimento eseguito.");
            return;
        }

        userRepository.saveAll(daCreare);
        log.info("Creati {} utenti demo all'avvio.", daCreare.size());
    }

    private User buildStudente(String username, String fullName, String classroom) {
        return User.builder()
                .username(username)
                .email(username + "@marconirovereto.it")
                .passwordHash(passwordEncoder.encode(DEFAULT_PASSWORD))
                .fullName(fullName)
                .classroom(classroom)
                .isAdmin(false)
                .isActive(true)
                .build();
    }

    private User buildAdmin(String username, String fullName) {
        return User.builder()
                .username(username)
                .email(username + "@marconirovereto.it")
                .passwordHash(passwordEncoder.encode(DEFAULT_PASSWORD))
                .fullName(fullName)
                .classroom("ADMIN")
                .isAdmin(true)
                .isActive(true)
                .build();
    }
}
