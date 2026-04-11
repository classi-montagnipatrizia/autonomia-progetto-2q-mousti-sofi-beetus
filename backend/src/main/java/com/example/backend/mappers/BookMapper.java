package com.example.backend.mappers;

import com.example.backend.dtos.response.BookResponseDTO;
import com.example.backend.dtos.response.BookSummaryDTO;
import com.example.backend.models.Book;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class BookMapper {

    private final UserMapper userMapper;

    public BookResponseDTO toBookResponseDTO(Book book) {
        if (book == null) return null;
        return BookResponseDTO.builder()
                .id(book.getId())
                .titolo(book.getTitle())
                .autore(book.getAuthor())
                .isbn(book.getIsbn())
                .descrizione(book.getDescription())
                .prezzo(book.getPrice())
                .condizione(book.getCondition())
                .stato(book.getStatus())
                .annoScolastico(book.getSchoolYear())
                .materia(book.getSubject())
                .frontImageUrl(book.getFrontImageUrl())
                .backImageUrl(book.getBackImageUrl() != null && !book.getBackImageUrl().isBlank() ? book.getBackImageUrl() : null)
                .venditore(userMapper.toUtenteSummaryDTO(book.getSeller()))
                .createdAt(book.getCreatedAt())
                .updatedAt(book.getUpdatedAt())
                .build();
    }

    public BookSummaryDTO toBookSummaryDTO(Book book) {
        if (book == null) return null;
        return BookSummaryDTO.builder()
                .id(book.getId())
                .titolo(book.getTitle())
                .autore(book.getAuthor())
                .prezzo(book.getPrice())
                .condizione(book.getCondition())
                .stato(book.getStatus())
                .annoScolastico(book.getSchoolYear())
                .materia(book.getSubject())
                .frontImageUrl(book.getFrontImageUrl())
                .venditore(userMapper.toUtenteSummaryDTO(book.getSeller()))
                .createdAt(book.getCreatedAt())
                .build();
    }
}
