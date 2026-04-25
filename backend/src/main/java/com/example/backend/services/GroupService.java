package com.example.backend.services;

import com.example.backend.dtos.request.CreaGruppoRequestDTO;
import com.example.backend.dtos.request.InviaMessaggioGruppoRequestDTO;
import com.example.backend.dtos.request.ModificaGruppoRequestDTO;
import com.example.backend.dtos.response.GroupMessageDTO;
import com.example.backend.dtos.response.GroupResponseDTO;
import com.example.backend.dtos.response.GroupSummaryDTO;
import com.example.backend.exception.InvalidInputException;
import com.example.backend.exception.ResourceNotFoundException;
import com.example.backend.exception.UnauthorizedException;
import com.example.backend.mappers.GroupMapper;
import com.example.backend.models.Group;
import com.example.backend.models.GroupMembership;
import com.example.backend.models.GroupMessage;
import com.example.backend.models.User;
import com.example.backend.repositories.GroupMembershipRepository;
import com.example.backend.repositories.GroupMessageRepository;
import com.example.backend.repositories.GroupRepository;
import com.example.backend.repositories.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class GroupService {

    private final GroupRepository groupRepository;
    private final GroupMembershipRepository membershipRepository;
    private final GroupMessageRepository messageRepository;
    private final UserRepository userRepository;
    private final GroupMapper groupMapper;
    private final SimpMessagingTemplate messagingTemplate;
    private final ImageService imageService;
    private final TypingIndicatorService typingIndicatorService;
    private final NotificationService notificationService;

    private static final String ENTITY_GROUP = "Gruppo";
    private static final String ENTITY_USER = "Utente";
    private static final String FIELD_ID = "id";

    // ── CRUD GRUPPO ──────────────────────────────────────────────────────────

    @Transactional
    public GroupResponseDTO creaGruppo(Long adminId, CreaGruppoRequestDTO request) {
        User admin = userRepository.findById(adminId)
                .orElseThrow(() -> new ResourceNotFoundException(ENTITY_USER, FIELD_ID, adminId));

        Group group = Group.builder()
                .name(request.getNome())
                .description(request.getDescrizione())
                .profilePictureUrl(request.getProfilePictureUrl())
                .admin(admin)
                .build();
        group = groupRepository.save(group);

        // Il creatore è automaticamente membro
        GroupMembership adminMembership = GroupMembership.builder()
                .group(group)
                .user(admin)
                .build();
        membershipRepository.save(adminMembership);

        log.info("Gruppo creato - ID: {}, Nome: {}, Admin: {}", group.getId(), group.getName(), admin.getUsername());
        return groupMapper.toResponseDTO(group, List.of(adminMembership), adminId);
    }

    @Transactional(readOnly = true)
    public List<GroupSummaryDTO> getMieiGruppi(Long userId) {
        List<GroupMembership> memberships = membershipRepository.findByUserIdWithGroup(userId);

        if (memberships.isEmpty()) {
            return List.of();
        }

        List<Long> groupIds = memberships.stream()
                .map(m -> m.getGroup().getId())
                .toList();

        Map<Long, Long> memberCounts = new HashMap<>();
        for (Object[] row : membershipRepository.countByGroupIds(groupIds)) {
            memberCounts.put((Long) row[0], (Long) row[1]);
        }

        Map<Long, GroupMessage> lastMessages = new HashMap<>();
        for (GroupMessage msg : messageRepository.findLatestByGroupIds(groupIds)) {
            lastMessages.put(msg.getGroup().getId(), msg);
        }

        Map<Long, Long> unreadCounts = new HashMap<>();
        for (Object[] row : membershipRepository.countUnreadMessagesBatch(userId, groupIds)) {
            unreadCounts.put((Long) row[0], (Long) row[1]);
        }
        for (Object[] row : membershipRepository.countUnreadMessagesNeverReadBatch(userId, groupIds)) {
            unreadCounts.put((Long) row[0], (Long) row[1]);
        }

        return memberships.stream().map(membership -> {
            Group group = membership.getGroup();
            Long gid = group.getId();
            long memberCount = memberCounts.getOrDefault(gid, 0L);
            GroupMessage lastMessage = lastMessages.get(gid);
            long unreadCount = unreadCounts.getOrDefault(gid, 0L);

            return groupMapper.toSummaryDTO(group, membership, unreadCount, lastMessage, memberCount, userId);
        }).toList();
    }

    @Transactional(readOnly = true)
    public GroupResponseDTO getDettaglioGruppo(Long groupId, Long userId) {
        Group group = findGroupWithAdmin(groupId);
        verificaMembro(group, userId);

        List<GroupMembership> memberships = membershipRepository.findByGroupOrderByJoinedAtAsc(group);
        return groupMapper.toResponseDTO(group, memberships, userId);
    }

    @Transactional
    public GroupResponseDTO modificaGruppo(Long groupId, Long adminId, ModificaGruppoRequestDTO request) {
        Group group = findGroupWithAdmin(groupId);
        verificaAdmin(group, adminId);

        // Elimina vecchia foto se viene sostituita
        if (request.getProfilePictureUrl() != null
                && group.getProfilePictureUrl() != null
                && !request.getProfilePictureUrl().equals(group.getProfilePictureUrl())) {
            imageService.deleteMessageImage(group.getProfilePictureUrl());
        }

        if (request.getNome() != null && !request.getNome().isBlank()) {
            group.setName(request.getNome());
        }
        if (request.getDescrizione() != null) {
            group.setDescription(request.getDescrizione());
        }
        if (request.getProfilePictureUrl() != null) {
            group.setProfilePictureUrl(request.getProfilePictureUrl());
        }

        group = groupRepository.save(group);
        List<GroupMembership> memberships = membershipRepository.findByGroupOrderByJoinedAtAsc(group);
        return groupMapper.toResponseDTO(group, memberships, adminId);
    }

    @Transactional
    public void eliminaGruppo(Long groupId, Long adminId) {
        Group group = findGroupWithAdmin(groupId);
        verificaAdmin(group, adminId);

        // Elimina foto profilo da Cloudinary
        if (group.getProfilePictureUrl() != null) {
            imageService.deleteMessageImage(group.getProfilePictureUrl());
        }

        // Cleanup file media dei messaggi da Cloudinary
        List<GroupMessage> mediaMessages = messageRepository.findMediaMessagesByGroup(group);
        for (GroupMessage msg : mediaMessages) {
            if (msg.getImageUrl() != null) imageService.deleteMessageImage(msg.getImageUrl());
            if (msg.getAudioUrl() != null) imageService.deleteMessageImage(msg.getAudioUrl());
        }

        // Cascade delete: messaggi → membership → gruppo
        messageRepository.deleteByGroup(group);
        membershipRepository.deleteByGroup(group);
        groupRepository.delete(group);

        log.info("Gruppo eliminato - ID: {}, Admin: {}", groupId, adminId);
    }

    // ── GESTIONE MEMBRI ───────────────────────────────────────────────────────

    @Transactional
    public GroupResponseDTO aggiungiMembro(Long groupId, Long adminId, Long targetUserId) {
        Group group = findGroupWithAdmin(groupId);
        verificaAdmin(group, adminId);

        User target = userRepository.findById(targetUserId)
                .orElseThrow(() -> new ResourceNotFoundException(ENTITY_USER, FIELD_ID, targetUserId));

        if (membershipRepository.existsByGroupAndUser(group, target)) {
            throw new InvalidInputException("L'utente è già membro del gruppo");
        }

        GroupMembership membership = GroupMembership.builder()
                .group(group)
                .user(target)
                .build();
        membershipRepository.save(membership);

        log.info("Membro aggiunto al gruppo {} - User: {}", groupId, targetUserId);

        // Notifica l'utente aggiunto
        try {
            notificationService.creaNotificaInvitoGruppo(targetUserId, adminId, groupId, group.getName());
        } catch (Exception e) {
            log.warn("Impossibile creare notifica GROUP_INVITE: {}", e.getMessage());
        }

        List<GroupMembership> memberships = membershipRepository.findByGroupOrderByJoinedAtAsc(group);
        return groupMapper.toResponseDTO(group, memberships, adminId);
    }

    @Transactional
    public GroupResponseDTO rimuoviMembro(Long groupId, Long adminId, Long targetUserId) {
        Group group = findGroupWithAdmin(groupId);
        verificaAdmin(group, adminId);

        if (group.getAdmin().getId().equals(targetUserId)) {
            throw new InvalidInputException("Non puoi rimuovere l'admin dal gruppo");
        }

        User target = userRepository.findById(targetUserId)
                .orElseThrow(() -> new ResourceNotFoundException(ENTITY_USER, FIELD_ID, targetUserId));

        GroupMembership membership = membershipRepository.findByGroupAndUser(group, target)
                .orElseThrow(() -> new ResourceNotFoundException("Membership", FIELD_ID, targetUserId));

        membershipRepository.delete(membership);
        log.info("Membro rimosso dal gruppo {} - User: {}", groupId, targetUserId);

        List<GroupMembership> memberships = membershipRepository.findByGroupOrderByJoinedAtAsc(group);
        return groupMapper.toResponseDTO(group, memberships, adminId);
    }

    @Transactional
    public void abbandonaGruppo(Long groupId, Long userId) {
        Group group = findGroupWithAdmin(groupId);

        if (group.getAdmin().getId().equals(userId)) {
            throw new InvalidInputException("Sei l'admin del gruppo: non puoi abbandonarlo. Puoi solo eliminarlo.");
        }

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException(ENTITY_USER, FIELD_ID, userId));

        GroupMembership membership = membershipRepository.findByGroupAndUser(group, user)
                .orElseThrow(() -> new ResourceNotFoundException("Membership", FIELD_ID, userId));

        membershipRepository.delete(membership);
        log.info("Utente {} ha abbandonato il gruppo {}", userId, groupId);
    }

    // ── MESSAGGI ─────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public Page<GroupMessageDTO> getMessaggi(Long groupId, Long userId, Pageable pageable) {
        Group group = findGroupWithAdmin(groupId);
        verificaMembro(group, userId);

        return messageRepository.findByGroupWithSender(group, pageable)
                .map(groupMapper::toMessageDTO);
    }

    @Transactional
    public GroupMessageDTO inviaMessaggio(Long groupId, Long senderId,
                                          InviaMessaggioGruppoRequestDTO request) {
        Group group = findGroupWithAdmin(groupId);

        User sender = userRepository.findById(senderId)
                .orElseThrow(() -> new ResourceNotFoundException(ENTITY_USER, FIELD_ID, senderId));

        verificaMembro(group, senderId);

        // Validazione contenuto
        if (!request.isValid()) {
            throw new InvalidInputException("Il messaggio deve contenere almeno un testo o un audio");
        }
        if (request.isAudioMessage()) {
            if (request.getContenuto() != null && !request.getContenuto().isBlank()) {
                throw new InvalidInputException("Un messaggio audio non può contenere testo");
            }
            if (request.getAudioDuration() == null) {
                throw new InvalidInputException("La durata dell'audio è obbligatoria");
            }
            if (request.getAudioDuration() > 120) {
                throw new InvalidInputException("I messaggi vocali non possono superare 2 minuti");
            }
        }

        GroupMessage message = GroupMessage.builder()
                .group(group)
                .sender(sender)
                .content((request.isAudioMessage() || request.isImageMessage()) ? null : request.getContenuto())
                .imageUrl(request.getImageUrl())
                .audioUrl(request.getAudioUrl())
                .audioDuration(request.getAudioDuration())
                .build();
        message = messageRepository.save(message);

        GroupMessageDTO dto = groupMapper.toMessageDTO(message);

        // Broadcast real-time a tutti i membri iscritti al topic del gruppo
        try {
            messagingTemplate.convertAndSend("/topic/group." + groupId, dto);
            log.debug("Messaggio gruppo broadcast - Group: {}, Sender: {}", groupId, sender.getUsername());
        } catch (Exception e) {
            log.warn("Impossibile inviare broadcast WebSocket al gruppo {}: {}", groupId, e.getMessage());
        }

        // Notifica ai membri del gruppo (tranne il mittente)
        try {
            List<Long> memberIds = membershipRepository.findMemberIdsByGroupId(groupId);
            notificationService.creaNotificheMessaggioGruppo(memberIds, senderId, groupId, group.getName());
        } catch (Exception e) {
            log.warn("Impossibile creare notifiche GROUP_MESSAGE per gruppo {}: {}", groupId, e.getMessage());
        }

        return dto;
    }

    @Transactional
    public void eliminaMessaggio(Long groupId, Long messageId, Long userId) {
        Group group = findGroupWithAdmin(groupId);
        verificaMembro(group, userId);

        GroupMessage message = messageRepository.findById(messageId)
                .orElseThrow(() -> new ResourceNotFoundException("Messaggio", FIELD_ID, messageId));

        // Verifica che il messaggio appartenga al gruppo
        if (!message.getGroup().getId().equals(groupId)) {
            throw new InvalidInputException("Il messaggio non appartiene a questo gruppo");
        }

        // Solo il mittente può eliminare il proprio messaggio
        if (!message.getSender().getId().equals(userId)) {
            throw new UnauthorizedException("Puoi eliminare solo i tuoi messaggi");
        }

        // Cleanup Cloudinary
        if (message.getImageUrl() != null && !message.getImageUrl().isBlank()) {
            imageService.deleteMessageImage(message.getImageUrl());
            message.setImageUrl(null);
        }
        if (message.getAudioUrl() != null && !message.getAudioUrl().isBlank()) {
            imageService.deleteMessageImage(message.getAudioUrl());
            message.setAudioUrl(null);
            message.setAudioDuration(null);
        }

        message.setContent(null);
        message.setDeletedBySender(true);
        messageRepository.save(message);

        log.info("Messaggio gruppo {} eliminato (soft delete) dal mittente {}", messageId, userId);

        // Broadcast eliminazione ai membri del gruppo
        try {
            GroupMessageDTO dto = groupMapper.toMessageDTO(message);
            messagingTemplate.convertAndSend("/topic/group." + groupId, dto);
        } catch (Exception e) {
            log.warn("Impossibile inviare broadcast eliminazione al gruppo {}: {}", groupId, e.getMessage());
        }
    }

    @Transactional
    public void segnaLetto(Long groupId, Long userId) {
        Group group = findGroupWithAdmin(groupId);

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException(ENTITY_USER, FIELD_ID, userId));

        GroupMembership membership = membershipRepository.findByGroupAndUser(group, user)
                .orElseThrow(() -> new ResourceNotFoundException("Membership", FIELD_ID, userId));

        membership.setLastReadAt(LocalDateTime.now());
        membershipRepository.save(membership);
    }

    // ── TYPING INDICATORS ──────────────────────────────────────────────────

    public void setGroupTyping(Long groupId, Long senderId, String senderUsername) {
        // Usa chiave "group:{groupId}:{senderId}" nel TypingIndicatorService
        typingIndicatorService.setTyping(-groupId, senderId);

        // Broadcast a tutti i membri del gruppo via WebSocket
        try {
            messagingTemplate.convertAndSend("/topic/group." + groupId + ".typing",
                    (Object) java.util.Map.of(
                            "senderId", senderId,
                            "senderUsername", senderUsername,
                            "isTyping", true
                    ));
        } catch (Exception e) {
            log.warn("Impossibile inviare typing broadcast al gruppo {}: {}", groupId, e.getMessage());
        }
    }

    public void clearGroupTyping(Long groupId, Long senderId, String senderUsername) {
        typingIndicatorService.clearTyping(-groupId, senderId);

        try {
            messagingTemplate.convertAndSend("/topic/group." + groupId + ".typing",
                    (Object) java.util.Map.of(
                            "senderId", senderId,
                            "senderUsername", senderUsername,
                            "isTyping", false
                    ));
        } catch (Exception e) {
            log.warn("Impossibile inviare clear typing broadcast al gruppo {}: {}", groupId, e.getMessage());
        }
    }

    // ── HELPER ───────────────────────────────────────────────────────────────

    private Group findGroupWithAdmin(Long groupId) {
        return groupRepository.findByIdWithAdmin(groupId)
                .orElseThrow(() -> new ResourceNotFoundException(ENTITY_GROUP, FIELD_ID, groupId));
    }

    private void verificaAdmin(Group group, Long userId) {
        if (!group.getAdmin().getId().equals(userId)) {
            throw new UnauthorizedException("Solo l'admin può eseguire questa operazione");
        }
    }

    private void verificaMembro(Group group, Long userId) {
        User user = userRepository.getReferenceById(userId);
        if (!membershipRepository.existsByGroupAndUser(group, user)) {
            throw new UnauthorizedException("Non sei membro di questo gruppo");
        }
    }
}
