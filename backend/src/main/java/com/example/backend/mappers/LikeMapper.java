package com.example.backend.mappers;

import com.example.backend.dtos.response.LikeResponseDTO;
import com.example.backend.models.Like;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class LikeMapper {

    private final UserMapper userMapper;

    public LikeResponseDTO toLikeResponseDTO(Like like) {
        if (like == null) return null;

        return LikeResponseDTO.builder()
                .utente(userMapper.toUtenteSummaryDTO(like.getUser()))
                .createdAt(like.getCreatedAt())
                .build();
    }
}
