package com.example.backend.security;

import com.example.backend.exception.UnauthorizedException;
import com.example.backend.models.User;
import com.example.backend.repositories.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

/**
 * Service per caricare i dettagli dell'utente dal database.
 * Implementa l'interfaccia UserDetailsService di Spring Security.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class CustomUserDetailsService implements UserDetailsService {

    private final UserRepository userRepository;

    /**
     * Carica un utente per username dal database
     *
     * @param username Username dell'utente
     * @return UserDetails con informazioni utente e ruoli
     * @throws UsernameNotFoundException se l'utente non viene trovato
     * @throws UnauthorizedException se l'utente è disattivato
     */
    @Override
    public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
        log.debug("Caricamento utente: {}", username);

        // Cerca l'utente per username (solo se attivo)
        User user = userRepository.findByUsernameAndIsActiveTrue(username)
                .orElseThrow(() -> {
                    log.warn("Tentativo di accesso con username inesistente o non attivo: {}", username);
                    return new UsernameNotFoundException("Utente non trovato o non attivo con username: " + username);
                });

        // Crea la lista dei ruoli
        List<SimpleGrantedAuthority> authorities = new ArrayList<>();
        authorities.add(new SimpleGrantedAuthority("ROLE_STUDENT"));

        if (user.getIsAdmin().booleanValue()) {
            authorities.add(new SimpleGrantedAuthority("ROLE_ADMIN"));
            log.debug("Utente {} caricato con ruolo ADMIN", username);
        } else {
            log.debug("Utente {} caricato con ruolo STUDENT", username);
        }

        // Restituisce un UserDetails con le informazioni dell'utente
        return org.springframework.security.core.userdetails.User.builder()
                .username(user.getUsername())
                .password(user.getPasswordHash())
                .authorities(authorities)
                .accountExpired(false)
                .accountLocked(!user.getIsActive())
                .credentialsExpired(false)
                .disabled(!user.getIsActive())
                .build();
    }
}