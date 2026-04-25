package com.example.backend.dtos.request;

import com.example.backend.models.BookCondition;
import jakarta.validation.constraints.*;
import lombok.Data;

import java.math.BigDecimal;

@Data
public class ModificaLibroRequestDTO {

    @Size(max = 200, message = "Il titolo non può superare 200 caratteri")
    private String titolo;

    @Size(max = 200, message = "L'autore non può superare 200 caratteri")
    private String autore;

    @Size(max = 20, message = "L'ISBN non può superare 20 caratteri")
    private String isbn;

    @Size(max = 500, message = "La descrizione non può superare 500 caratteri")
    private String descrizione;

    @DecimalMin(value = "0.00", message = "Il prezzo non può essere negativo")
    @Digits(integer = 6, fraction = 2, message = "Il prezzo non è valido")
    private BigDecimal prezzo;

    private BookCondition condizione;

    @Size(max = 20, message = "L'anno scolastico non può superare 20 caratteri")
    private String annoScolastico;

    @Size(max = 50, message = "La materia non può superare 50 caratteri")
    private String materia;

    @Pattern(regexp = "^https://res\\.cloudinary\\.com/.*$", message = "URL immagine frontale non valido")
    private String frontImageUrl;

    @Pattern(regexp = "^https://res\\.cloudinary\\.com/.*$", message = "URL immagine posteriore non valido")
    private String backImageUrl;
}
