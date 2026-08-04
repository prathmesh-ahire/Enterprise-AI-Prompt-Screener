package com.screener.repository;

import com.screener.model.AuditEvent;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;

public interface AuditEventRepository extends JpaRepository<AuditEvent, Long> {
    long countByUserIdAndActionInAndCreatedAtAfter(Long userId, List<String> actions, LocalDateTime after);

    Page<AuditEvent> findByUserId(Long userId, Pageable pageable);

    // 21.6: same createdAt-based pattern as the Phase 10.8 per-user query above, grouped
    // across all users instead of checking one at a time.
    @Query("SELECT ae.userId, COUNT(ae) FROM AuditEvent ae WHERE ae.action IN :actions AND ae.createdAt >= :since "
            + "GROUP BY ae.userId HAVING COUNT(ae) >= :minCount")
    List<Object[]> findUserIdsWithActionCountAtLeast(@Param("actions") List<String> actions,
                                                        @Param("since") LocalDateTime since,
                                                        @Param("minCount") long minCount);
}
