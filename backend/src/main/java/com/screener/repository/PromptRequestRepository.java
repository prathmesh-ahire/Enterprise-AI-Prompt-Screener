package com.screener.repository;

import com.screener.model.PromptRequest;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PromptRequestRepository extends JpaRepository<PromptRequest, Long> {
}
