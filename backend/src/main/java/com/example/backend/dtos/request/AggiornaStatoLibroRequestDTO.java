package com.example.backend.dtos.request;

import com.example.backend.models.BookStatus;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class AggiornaStatoLibroRequestDTO {

    @NotNull(message = "Lo stato è obbligatorio")
    private BookStatus stato;
}
