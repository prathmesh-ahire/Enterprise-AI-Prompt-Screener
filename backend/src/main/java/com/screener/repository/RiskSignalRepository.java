package com.screener.repository;

import com.screener.model.RiskSignal;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface RiskSignalRepository extends JpaRepository<RiskSignal, Long> {
    // matched signals for the review-details screen.
    List<RiskSignal> findByRequestId(UUID requestId);

    // retention cleanup job.
    void deleteByRequestIdIn(List<UUID> requestIds);
}
