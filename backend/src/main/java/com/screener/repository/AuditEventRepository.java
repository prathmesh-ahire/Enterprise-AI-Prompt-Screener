package com.screener.repository;

import com.screener.model.AuditEvent;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.List;

public interface AuditEventRepository extends JpaRepository<AuditEvent, Long> {
    long countByUserIdAndActionInAndCreatedAtAfter(Long userId, List<String> actions, LocalDateTime after);
}
