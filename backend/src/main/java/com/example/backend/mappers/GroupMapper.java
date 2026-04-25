package com.example.backend.mappers;

import com.example.backend.dtos.response.GroupMemberDTO;
import com.example.backend.dtos.response.GroupMessageDTO;
import com.example.backend.dtos.response.GroupResponseDTO;
import com.example.backend.dtos.response.GroupSummaryDTO;
import com.example.backend.models.Group;
import com.example.backend.models.GroupMembership;
import com.example.backend.models.GroupMessage;
import com.example.backend.models.User;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
@RequiredArgsConstructor
public class GroupMapper {

    public GroupSummaryDTO toSummaryDTO(Group group, GroupMembership membership,
                                        long unreadCount, GroupMessage lastMessage,
                                        long memberCount, Long currentUserId) {
        return GroupSummaryDTO.builder()
                .id(group.getId())
                .name(group.getName())
                .description(group.getDescription())
                .profilePictureUrl(group.getProfilePictureUrl())
                .memberCount((int) memberCount)
                .unreadCount(unreadCount)
                .lastMessageContent(lastMessage != null ? getMessagePreview(lastMessage) : null)
                .lastMessageAt(lastMessage != null ? lastMessage.getCreatedAt() : null)
                .isAdmin(group.getAdmin().getId().equals(currentUserId))
                .build();
    }

    public GroupResponseDTO toResponseDTO(Group group, List<GroupMembership> memberships,
                                          Long currentUserId) {
        List<GroupMemberDTO> members = memberships.stream()
                .map(m -> toMemberDTO(m, group.getAdmin().getId()))
                .toList();

        return GroupResponseDTO.builder()
                .id(group.getId())
                .name(group.getName())
                .description(group.getDescription())
                .profilePictureUrl(group.getProfilePictureUrl())
                .adminId(group.getAdmin().getId())
                .adminUsername(group.getAdmin().getUsername())
                .memberCount(memberships.size())
                .members(members)
                .createdAt(group.getCreatedAt())
                .isAdmin(group.getAdmin().getId().equals(currentUserId))
                .build();
    }

    public GroupMemberDTO toMemberDTO(GroupMembership membership, Long adminId) {
        User user = membership.getUser();
        return GroupMemberDTO.builder()
                .id(user.getId())
                .username(user.getUsername())
                .fullName(user.getFullName())
                .profilePictureUrl(user.getProfilePictureUrl())
                .isAdmin(user.getId().equals(adminId))
                .joinedAt(membership.getJoinedAt())
                .build();
    }

    private String getMessagePreview(GroupMessage message) {
        if (message.isDeletedBySender()) return null;
        if (message.getContent() != null) return message.getContent();
        if (message.getAudioUrl() != null) return "🎤 Messaggio vocale";
        if (message.getImageUrl() != null) return "📷 Foto";
        return null;
    }

    public GroupMessageDTO toMessageDTO(GroupMessage message) {
        User sender = message.getSender();
        return GroupMessageDTO.builder()
                .id(message.getId())
                .groupId(message.getGroup().getId())
                .senderId(sender.getId())
                .senderUsername(sender.getUsername())
                .senderFullName(sender.getFullName())
                .senderProfilePictureUrl(sender.getProfilePictureUrl())
                .content(message.isDeletedBySender() ? null : message.getContent())
                .imageUrl(message.isDeletedBySender() ? null : message.getImageUrl())
                .audioUrl(message.isDeletedBySender() ? null : message.getAudioUrl())
                .audioDuration(message.isDeletedBySender() ? null : message.getAudioDuration())
                .isDeletedBySender(message.isDeletedBySender())
                .createdAt(message.getCreatedAt())
                .build();
    }
}
