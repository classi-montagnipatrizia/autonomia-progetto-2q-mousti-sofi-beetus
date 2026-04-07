package com.example.backend.events;

import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public class BookRequestedEvent {
    private final Long bookId;
    private final Long requesterId;
    private final Long sellerId;
}
