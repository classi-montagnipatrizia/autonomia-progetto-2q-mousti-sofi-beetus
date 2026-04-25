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
           "WHERE m.id IN (SELECT MAX(m2.id) FROM GroupMessage m2 " +
           "WHERE m2.group.id IN :groupIds GROUP BY m2.group.id)")
    List<GroupMessage> findLatestByGroupIds(@Param("groupIds") List<Long> groupIds);
}
