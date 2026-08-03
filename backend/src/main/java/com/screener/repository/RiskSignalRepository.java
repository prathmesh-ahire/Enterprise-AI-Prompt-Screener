package com.screener.repository;

import com.screener.model.RiskSignal;
import org.springframework.data.jpa.repository.JpaRepository;

public interface RiskSignalRepository extends JpaRepository<RiskSignal, Long> {
}
