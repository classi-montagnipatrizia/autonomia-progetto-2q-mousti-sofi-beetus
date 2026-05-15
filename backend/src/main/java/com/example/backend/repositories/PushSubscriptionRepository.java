package com.example.backend.repositories;

import com.example.backend.models.PushSubscription;
import com.example.backend.models.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

public interface PushSubscriptionRepository extends JpaRepository<PushSubscription, Long> {

    List<PushSubscription> findByUser(User user);

    @Query("SELECT ps FROM PushSubscription ps WHERE ps.user.id = :userId")
    List<PushSubscription> findByUserId(@Param("userId") Long userId);

    Optional<PushSubscription> findByEndpoint(String endpoint);

    @Modifying
    @Transactional
    @Query("DELETE FROM PushSubscription ps WHERE ps.endpoint = :endpoint")
    void deleteByEndpoint(@Param("endpoint") String endpoint);
}
