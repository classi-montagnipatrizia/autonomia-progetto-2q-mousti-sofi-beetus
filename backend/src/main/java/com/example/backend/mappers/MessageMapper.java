package com.example.backend.mappers;

import com.example.backend.dtos.response.MessageResponseDTO;
import com.example.backend.dtos.response.ConversationResponseDTO;
import com.example.backend.models.DirectMessage;
import com.example.backend.models.User;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class MessageMapper {

    private final UserMapper userMapper;

    public MessageResponseDTO toMessaggioResponseDTO(DirectMessage message) {
        return toMessaggioResponseDTO(message, false);
    }

    public MessageResponseDTO toMessaggioResponseDTO(DirectMessage message, boolean isHiddenByCurrentUser) {
        if (message == null) return null;

        return MessageResponseDTO.builder()
                .id(message.getId())
                .mittente(userMapper.toUtenteSummaryDTO(message.getSender()))
                .destinatario(userMapper.toUtenteSummaryDTO(message.getReceiver()))
                .contenuto(message.getContent())
                .imageUrl(message.getImageUrl())
                .isRead(message.isRead())
                .isDeletedBySender(message.isDeletedBySender())
                .isHiddenByCurrentUser(isHiddenByCurrentUser)
                .createdAt(message.getCreatedAt())
                .build();
    }

    public ConversationResponseDTO toConversazioneResponseDTO(
            User altroUtente,
            DirectMessage ultimoMessaggio,
            Integer messaggiNonLetti) {

        return toConversazioneResponseDTO(altroUtente, ultimoMessaggio, messaggiNonLetti, false);
    }

    public ConversationResponseDTO toConversazioneResponseDTO(
            User altroUtente,
            DirectMessage ultimoMessaggio,
            Integer messaggiNonLetti,
            boolean isLastMessageHidden) {

        return ConversationResponseDTO.builder()
                .altroUtente(userMapper.toUtenteSummaryDTO(altroUtente))
                .ultimoMessaggio(toMessaggioResponseDTO(ultimoMessaggio, isLastMessageHidden))
                .messaggiNonLetti(messaggiNonLetti)
                .ultimaAttivita(ultimoMessaggio != null ?
                        ultimoMessaggio.getCreatedAt() : null)
                .build();
    }
}