package com.example.backend.repositories;

import com.example.backend.models.Group;
import com.example.backend.models.GroupMembership;
import com.example.backend.models.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface GroupMembershipRepository extends JpaRepository<GroupMembership, Long> {

    Optional<GroupMembership> findByGroupAndUser(Group group, User user);

    boolean existsByGroupAndUser(Group group, User user);

    List<GroupMembership> findByGroupOrderByJoinedAtAsc(Group group);

    long countByGroup(Group group);

    @Query("SELECT m FROM GroupMembership m JOIN FETCH m.group g JOIN FETCH g.admin " +
           "WHERE m.user.id = :userId ORDER BY g.createdAt DESC")
    List<GroupMembership> findByUserIdWithGroup(@Param("userId") Long userId);

    @Query("SELECT COUNT(msg) FROM GroupMessage msg WHERE msg.group.id = :groupId " +
           "AND msg.createdAt > :lastReadAt")
    long countUnreadMessages(@Param("groupId") Long groupId,
                             @Param("lastReadAt") LocalDateTime lastReadAt);

    void deleteByGroup(Group group);

    @Query("SELECT m.user.id FROM GroupMembership m WHERE m.group.id = :groupId")
    List<Long> findMemberIdsByGroupId(@Param("groupId") Long groupId);

    void deleteByUserId(Long userId);

    @Query("SELECT m.group FROM GroupMembership m WHERE m.user.id = :userId")
    List<Group> findGroupsByUserId(@Param("userId") Long userId);

    @Query("SELECT m.group.id, COUNT(m) FROM GroupMembership m " +
           "WHERE m.group.id IN :groupIds GROUP BY m.group.id")
    List<Object[]> countByGroupIds(@Param("groupIds") List<Long> groupIds);

    @Query("SELECT m.group.id, COUNT(msg) FROM GroupMembership m " +
           "JOIN GroupMessage msg ON msg.group.id = m.group.id AND msg.createdAt > m.lastReadAt " +
           "WHERE m.user.id = :userId AND m.group.id IN :groupIds AND m.lastReadAt IS NOT NULL " +
           "GROUP BY m.group.id")
    List<Object[]> countUnreadMessagesBatch(@Param("userId") Long userId,
                                            @Param("groupIds") List<Long> groupIds);

    @Query("SELECT m.group.id, COUNT(msg) FROM GroupMembership m " +
           "JOIN GroupMessage msg ON msg.group.id = m.group.id AND msg.createdAt > m.joinedAt " +
           "WHERE m.user.id = :userId AND m.group.id IN :groupIds AND m.lastReadAt IS NULL " +
           "GROUP BY m.group.id")
    List<Object[]> countUnreadMessagesNeverReadBatch(@Param("userId") Long userId,
                                                     @Param("groupIds") List<Long> groupIds);
}
