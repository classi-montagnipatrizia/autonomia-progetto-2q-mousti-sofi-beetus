package com.example.backend.config;

import com.example.backend.exception.ResourceNotFoundException;
import com.example.backend.models.User;
import com.example.backend.repositories.UserRepository;

import org.springframework.lang.NonNull;
import org.springframework.lang.Nullable;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.MethodParameter;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Component;
import org.springframework.web.bind.support.WebDataBinderFactory;
import org.springframework.web.context.request.NativeWebRequest;
import org.springframework.web.method.support.HandlerMethodArgumentResolver;
import org.springframework.web.method.support.ModelAndViewContainer;

/**
 * Resolver per iniettare automaticamente l'entità User autenticato nei
 * controller.
 * <p>
 * Questo resolver intercetta i parametri annotati con {@link CurrentUser} e:
 * 
 * - Estrae l'username dal SecurityContext
 * - Recupera l'entità User dal database
 * - Lancia ResourceNotFoundException se l'utente non esiste
 * 
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class CurrentUserArgumentResolver implements HandlerMethodArgumentResolver {

    private static final String ENTITY_USER = "User";
    private static final String FIELD_USERNAME = "username";

    private final UserRepository userRepository;

    @Override
    public boolean supportsParameter(@NonNull MethodParameter parameter) {
        return parameter.hasParameterAnnotation(CurrentUser.class)
                && parameter.getParameterType().equals(User.class);
    }

    @Override
    public Object resolveArgument(@NonNull MethodParameter parameter,
           @Nullable ModelAndViewContainer mavContainer,
          @NonNull  NativeWebRequest webRequest,
          @Nullable   WebDataBinderFactory binderFactory) {

        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();

        if (authentication == null || !authentication.isAuthenticated()) {
            log.error("Tentativo di accesso a risorsa protetta senza autenticazione");
            throw new IllegalStateException("Utente non autenticato");
        }

        Object principal = authentication.getPrincipal();
        String username;

        if (principal instanceof UserDetails userDetails) {
            username = userDetails.getUsername();
        } else {
            username = principal.toString();
        }

        log.debug("Resolving current user: {}", username);

        return userRepository.findByUsernameAndIsActiveTrue(username)
                .orElseThrow(() -> {
                    log.error("User not found or not active in database: {}", username);
                    return new ResourceNotFoundException(ENTITY_USER, FIELD_USERNAME, username);
                });
    }
}
