package com.screener.repository;

import com.screener.model.ScreeningDecision;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ScreeningDecisionRepository extends JpaRepository<ScreeningDecision, Long> {
    Optional<ScreeningDecision> findByRequestId(UUID requestId);

    // 19.1: batch lookup for a page of history items, avoids one query per row.
    List<ScreeningDecision> findByRequestIdIn(List<UUID> requestIds);
}
