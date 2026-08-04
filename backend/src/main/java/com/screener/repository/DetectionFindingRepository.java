package com.screener.repository;

import com.screener.model.DetectionFinding;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

public interface DetectionFindingRepository extends JpaRepository<DetectionFinding, Long> {
    List<DetectionFinding> findByRequestId(UUID requestId);

    // 20.6b: retention cleanup job.
    void deleteByRequestIdIn(List<UUID> requestIds);

    // 21.2: aggregate count per entity type, all-time.
    @Query("SELECT df.entityType, COUNT(df) FROM DetectionFinding df GROUP BY df.entityType")
    List<Object[]> countGroupedByEntityType();

    // 22.2/22.3: same breakdown, bounded to a report date range. DetectionFinding has no
    // timestamp column of its own (Phase 2.2.6) - filters via the ScreeningDecision row
    // sharing the same requestId (a plain JPQL multi-root query, not a mapped association).
    @Query("SELECT df.entityType, COUNT(df) FROM DetectionFinding df, ScreeningDecision sd "
            + "WHERE df.requestId = sd.requestId AND sd.timestamp BETWEEN :from AND :to GROUP BY df.entityType")
    List<Object[]> countGroupedByEntityTypeBetween(@Param("from") LocalDateTime from, @Param("to") LocalDateTime to);
}
