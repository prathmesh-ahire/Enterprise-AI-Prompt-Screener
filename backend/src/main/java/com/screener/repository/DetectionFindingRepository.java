package com.screener.repository;

import com.screener.model.DetectionFinding;
import org.springframework.data.jpa.repository.JpaRepository;

public interface DetectionFindingRepository extends JpaRepository<DetectionFinding, Long> {
}
