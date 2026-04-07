package com.example.backend.dtos.request;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class InviaMessaggioGruppoRequestDTO {

    @Size(max = 2000, message = "Il messaggio non può superare 2000 caratteri")
    private String contenuto;

    // URL immagine Cloudinary
    private String imageUrl;

    // URL audio Cloudinary (esclusivo: non combinabile con testo)
    private String audioUrl;

    @Min(value = 1, message = "La durata audio deve essere almeno 1 secondo")
    private Integer audioDuration;

    public boolean isValid() {
        boolean hasContent = contenuto != null && !contenuto.isBlank();
        boolean hasAudio = audioUrl != null && !audioUrl.isBlank();
        boolean hasImage = imageUrl != null && !imageUrl.isBlank();
        return hasContent || hasAudio || hasImage;
    }

    public boolean isAudioMessage() {
        return audioUrl != null && !audioUrl.isBlank();
    }

    public boolean isImageMessage() {
        return imageUrl != null && !imageUrl.isBlank();
    }
}
