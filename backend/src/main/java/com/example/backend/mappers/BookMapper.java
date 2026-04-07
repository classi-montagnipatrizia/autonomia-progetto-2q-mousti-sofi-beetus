package com.example.backend.mappers;

import com.example.backend.dtos.response.BookResponseDTO;
import com.example.backend.dtos.response.BookSummaryDTO;
import com.example.backend.models.Book;
import com.example.backend.models.BookRequestStatus;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class BookMapper {

    private final UserMapper userMapper;

    public BookResponseDTO toBookResponseDTO(Book book, int richiesteCount, BookRequestStatus miaRichiesta) {
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
                .backImageUrl(book.getBackImageUrl())
                .venditore(userMapper.toUtenteSummaryDTO(book.getSeller()))
                .richiesteCount(richiesteCount)
                .miaRichiesta(miaRichiesta)
                .createdAt(book.getCreatedAt())
                .updatedAt(book.getUpdatedAt())
                .build();
    }

    public BookResponseDTO toBookResponseDTO(Book book) {
        return toBookResponseDTO(book, 0, null);
    }

    public BookSummaryDTO toBookSummaryDTO(Book book, int richiesteCount, BookRequestStatus miaRichiesta) {
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
                .richiesteCount(richiesteCount)
                .miaRichiesta(miaRichiesta)
                .createdAt(book.getCreatedAt())
                .build();
    }

    public BookSummaryDTO toBookSummaryDTO(Book book) {
        return toBookSummaryDTO(book, 0, null);
    }
}
