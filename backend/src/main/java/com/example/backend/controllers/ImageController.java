package com.example.backend.controllers;

import com.example.backend.config.CurrentUser;
import com.example.backend.models.User;
import com.example.backend.services.ImageService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * Controller per la gestione delle immagini.
 * <p>
 * Espone endpoint per eliminare immagini da Cloudinary.
 * Tutti gli endpoint richiedono autenticazione.
 */
@RestController
@RequestMapping("/api/images")
@RequiredArgsConstructor
@Slf4j
public class ImageController {

    private final ImageService imageService;

    /**
     * DELETE /api/images
     * Elimina un'immagine da Cloudinary.
     * <p>
     * Questo endpoint:
     * 1. Verifica che l'utente sia il proprietario dell'immagine
     * 2. Elimina l'immagine da Cloudinary
     * 3. Rimuove il riferimento dal database
     * <p>
     * L'URL dell'immagine viene passato come query parameter.
     *
     * @param imageUrl URL completo dell'immagine su Cloudinary
     * @param user Utente autenticato (iniettato automaticamente)
     * @return ResponseEntity con status 204 No Content
     */
    @DeleteMapping
    public ResponseEntity<Void> deleteImage(
            @RequestParam("url") String imageUrl,
            @CurrentUser User user) {

        log.info("DELETE /api/images - URL: {}, User: {}", imageUrl, user.getUsername());

        imageService.deleteImage(imageUrl, user.getId());

        // Restituisce 204 No Content (eliminazione avvenuta con successo)
        return ResponseEntity.noContent().build();
    }
}
