package com.screener.repository;

import com.screener.model.PromptRequest;
import com.screener.model.PromptStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface PromptRequestRepository extends JpaRepository<PromptRequest, Long> {
    Optional<PromptRequest> findByRequestId(UUID requestId);

    // review queue, oldest-submitted first (FIFO).
    List<PromptRequest> findByStatusOrderBySubmittedAtAsc(PromptStatus status);

    // my-history, paginated.
    Page<PromptRequest> findByUserId(Long userId, Pageable pageable);

    // retention cleanup job.
    List<PromptRequest> findBySubmittedAtBefore(LocalDateTime cutoff);
}
