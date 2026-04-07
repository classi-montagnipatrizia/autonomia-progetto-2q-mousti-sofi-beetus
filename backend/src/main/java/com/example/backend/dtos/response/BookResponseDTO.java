package com.example.backend.dtos.response;

import com.example.backend.models.BookCondition;
import com.example.backend.models.BookRequestStatus;
import com.example.backend.models.BookStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BookResponseDTO {
    private Long id;
    private String titolo;
    private String autore;
    private String isbn;
    private String descrizione;
    private BigDecimal prezzo;
    private BookCondition condizione;
    private BookStatus stato;
    private String annoScolastico;
    private String materia;
    private String frontImageUrl;
    private String backImageUrl;
    private UserSummaryDTO venditore;
    private Integer richiesteCount;
    private BookRequestStatus miaRichiesta;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
