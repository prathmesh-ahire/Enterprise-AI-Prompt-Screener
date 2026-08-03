package com.screener.repository;

import com.screener.model.ScreeningDecision;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ScreeningDecisionRepository extends JpaRepository<ScreeningDecision, Long> {
}
