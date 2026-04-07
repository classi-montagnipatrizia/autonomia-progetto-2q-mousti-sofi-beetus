package com.example.backend.dtos.response;

import com.example.backend.models.BookRequestStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BookRequestDTO {
    private Long id;
    private UserSummaryDTO acquirente;
    private BookRequestStatus stato;
    private LocalDateTime createdAt;
}
