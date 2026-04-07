package com.example.backend.repositories;

import com.example.backend.models.Group;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface GroupRepository extends JpaRepository<Group, Long> {

    @Query("SELECT g FROM Group g JOIN FETCH g.admin WHERE g.id = :id")
    Optional<Group> findByIdWithAdmin(@Param("id") Long id);

    /**
     * Gruppi creati da un utente (come admin).
     */
    List<Group> findByAdminId(Long adminId);

    @Query("SELECT g FROM Group g JOIN FETCH g.admin ORDER BY g.createdAt DESC")
    Page<Group> findAllWithAdmin(Pageable pageable);
}
