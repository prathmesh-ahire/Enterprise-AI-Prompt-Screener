package com.screener.repository;

import com.screener.model.PromptRequest;
import com.screener.model.PromptStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface PromptRequestRepository extends JpaRepository<PromptRequest, Long> {
    Optional<PromptRequest> findByRequestId(UUID requestId);

    // 18.1: review queue, oldest-submitted first (FIFO).
    List<PromptRequest> findByStatusOrderBySubmittedAtAsc(PromptStatus status);
}
