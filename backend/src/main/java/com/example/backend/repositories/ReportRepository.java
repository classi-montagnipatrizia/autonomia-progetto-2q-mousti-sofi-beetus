package com.example.backend.repositories;

import com.example.backend.models.Report;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

@Repository
public interface ReportRepository extends JpaRepository<Report, Long> {

    boolean existsByReporterIdAndTargetTypeAndTargetId(Long reporterId, String targetType, Long targetId);

    @Query("SELECT r FROM Report r LEFT JOIN FETCH r.reporter LEFT JOIN FETCH r.resolvedBy ORDER BY r.createdAt DESC")
    Page<Report> findAllWithDetails(Pageable pageable);

    @Query("SELECT r FROM Report r LEFT JOIN FETCH r.reporter LEFT JOIN FETCH r.resolvedBy WHERE r.status = :status ORDER BY r.createdAt DESC")
    Page<Report> findByStatusWithDetails(String status, Pageable pageable);
}
