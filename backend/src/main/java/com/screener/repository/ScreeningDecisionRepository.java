package com.screener.repository;

import com.screener.model.ScreeningDecision;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface ScreeningDecisionRepository extends JpaRepository<ScreeningDecision, Long> {
    Optional<ScreeningDecision> findByRequestId(UUID requestId);
}
