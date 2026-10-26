package com.screener.repository;

import com.screener.model.ScreeningDecision;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ScreeningDecisionRepository extends JpaRepository<ScreeningDecision, Long> {
    Optional<ScreeningDecision> findByRequestId(UUID requestId);

    // batch lookup for a page of history items, avoids one query per row.
    List<ScreeningDecision> findByRequestIdIn(List<UUID> requestIds);

    // retention cleanup job.
    void deleteByRequestIdIn(List<UUID> requestIds);

    // aggregate count per decision band since a given instant (the summary passes
    // start-of-today, the risk distribution passes now-minus-7-days) - same query, different window.
    @Query("SELECT sd.decision, COUNT(sd) FROM ScreeningDecision sd WHERE sd.timestamp >= :since GROUP BY sd.decision")
    List<Object[]> countByDecisionSince(@Param("since") LocalDateTime since);

    // same shape as countByDecisionSince, but bounded on both ends for a
    // caller-selected report date range instead of an open-ended "since".
    @Query("SELECT sd.decision, COUNT(sd) FROM ScreeningDecision sd WHERE sd.timestamp BETWEEN :from AND :to GROUP BY sd.decision")
    List<Object[]> countByDecisionBetween(@Param("from") LocalDateTime from, @Param("to") LocalDateTime to);

    // last N BLOCK decisions, newest first - a bounded LIMIT query, not a full scan.
    List<ScreeningDecision> findTop10ByDecisionOrderByTimestampDesc(com.screener.model.Decision decision);

    // average/max screening latency over a caller-selected window. Always returns
    // exactly one row (a bare aggregate query with no GROUP BY) - still List<Object[]>,
    // not Object[] directly, since that's what Spring Data actually hands back for a
    // multi-column aggregate projection; declaring Object[] here double-wraps it.
    @Query("SELECT AVG(sd.processingTimeMs), MAX(sd.processingTimeMs) FROM ScreeningDecision sd "
            + "WHERE sd.timestamp BETWEEN :from AND :to")
    List<Object[]> processingTimeStatsBetween(@Param("from") LocalDateTime from, @Param("to") LocalDateTime to);
}
