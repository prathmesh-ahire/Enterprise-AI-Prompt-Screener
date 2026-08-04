package com.screener.repository;

import com.screener.model.DetectionFinding;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.UUID;

public interface DetectionFindingRepository extends JpaRepository<DetectionFinding, Long> {
    List<DetectionFinding> findByRequestId(UUID requestId);

    // 20.6b: retention cleanup job.
    void deleteByRequestIdIn(List<UUID> requestIds);

    // 21.2: aggregate count per entity type, all-time.
    @Query("SELECT df.entityType, COUNT(df) FROM DetectionFinding df GROUP BY df.entityType")
    List<Object[]> countGroupedByEntityType();
}
