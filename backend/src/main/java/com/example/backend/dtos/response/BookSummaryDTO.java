package com.example.backend.dtos.response;

import com.example.backend.models.BookCondition;
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
public class BookSummaryDTO {
    private Long id;
    private String titolo;
    private String autore;
    private BigDecimal prezzo;
    private BookCondition condizione;
    private BookStatus stato;
    private String annoScolastico;
    private String materia;
    private String frontImageUrl;
    private UserSummaryDTO venditore;
    private LocalDateTime createdAt;
}
