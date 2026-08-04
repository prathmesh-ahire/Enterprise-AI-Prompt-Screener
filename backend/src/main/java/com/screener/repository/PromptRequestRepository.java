package com.screener.repository;

import com.screener.model.PromptRequest;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface PromptRequestRepository extends JpaRepository<PromptRequest, Long> {
    Optional<PromptRequest> findByRequestId(UUID requestId);
}
