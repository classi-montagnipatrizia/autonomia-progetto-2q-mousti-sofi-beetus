package com.example.backend.dtos.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ChatbotResponseDTO {
    private String risposta;
    private List<BookSummaryDTO> libri; // libri suggeriti dall'AI (può essere vuoto)
}
