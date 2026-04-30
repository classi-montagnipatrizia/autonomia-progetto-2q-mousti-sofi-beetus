package com.example.backend.repositories;

import com.example.backend.models.Group;
import com.example.backend.models.GroupMessage;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.Collection;

public interface GroupMessageRepository extends JpaRepository<GroupMessage, Long> {

    @Query("SELECT m FROM GroupMessage m JOIN FETCH m.sender WHERE m.group = :group " +
           "ORDER BY m.createdAt DESC")
    Page<GroupMessage> findByGroupWithSender(@Param("group") Group group, Pageable pageable);

    @Query("SELECT m FROM GroupMessage m WHERE m.group.id = :groupId " +
           "ORDER BY m.createdAt DESC LIMIT 1")
    Optional<GroupMessage> findLatestByGroupId(@Param("groupId") Long groupId);

    void deleteByGroup(Group group);

    void deleteBySenderId(Long senderId);

    @Query("SELECT m FROM GroupMessage m WHERE m.group = :group AND (m.imageUrl IS NOT NULL OR m.audioUrl IS NOT NULL)")
    List<GroupMessage> findMediaMessagesByGroup(@Param("group") Group group);

    @Query("SELECT m FROM GroupMessage m WHERE m.sender.id = :senderId AND (m.imageUrl IS NOT NULL OR m.audioUrl IS NOT NULL)")
    List<GroupMessage> findMediaMessagesBySenderId(@Param("senderId") Long senderId);

    @Query("SELECT m FROM GroupMessage m JOIN FETCH m.sender " +
           "WHERE m.group.id = :groupId AND m.isDeletedBySender = false " +
           "AND LOWER(m.content) LIKE LOWER(CONCAT('%', :query, '%')) " +
           "ORDER BY m.createdAt DESC")
    Page<GroupMessage> searchMessages(@Param("groupId") Long groupId,
                                      @Param("query") String query,
                                      Pageable pageable);

    @Query("SELECT m FROM GroupMessage m JOIN FETCH m.sender " +
           "WHERE m.id IN (SELECT MAX(m2.id) FROM GroupMessage m2 " +
           "WHERE m2.group.id IN :groupIds GROUP BY m2.group.id)")
    List<GroupMessage> findLatestByGroupIds(@Param("groupIds") List<Long> groupIds);

    @Query("SELECT msg FROM GroupMessage msg JOIN FETCH msg.sender " +
           "WHERE msg.group.id IN (SELECT mem.group.id FROM GroupMembership mem WHERE mem.user.id = :userId) " +
           "AND msg.isDeletedBySender = false " +
           "AND LOWER(msg.content) LIKE LOWER(CONCAT('%', :query, '%')) " +
           "ORDER BY msg.createdAt DESC")
    List<GroupMessage> searchMessagesAcrossGroups(@Param("userId") Long userId,
                                                  @Param("query") String query,
                                                  Pageable pageable);
}
