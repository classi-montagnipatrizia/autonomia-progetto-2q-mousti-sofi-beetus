package com.example.backend.dtos.response;

import com.example.backend.models.BookCondition;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AnalizzaLibroResponseDTO {
    private String titolo;
    private String autore;
    private String isbn;
    private String materia;
    private String annoScolastico;
    private BigDecimal prezzo;
    private String descrizione;
    private BookCondition condizione;
}
