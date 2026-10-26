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

    // same createdAt-based pattern as the per-user query above, grouped
    // across all users instead of checking one at a time.
    //
    // also returns the username. The panel's whole job is answering "who keeps tripping
    // the screener", and returning only a numeric id meant an admin had to query the database
    // by hand to find out who that was. Joined as a multi-root query rather than a relationship
    // because AuditEvent.userId is a plain Long, not a @ManyToOne (a deliberate
    // design choice) - same shape as DetectionFindingRepository.countGroupedByEntityTypeBetween.
    @Query("SELECT ae.userId, u.username, COUNT(ae) FROM AuditEvent ae, User u "
            + "WHERE u.id = ae.userId AND ae.action IN :actions AND ae.createdAt >= :since "
            + "GROUP BY ae.userId, u.username HAVING COUNT(ae) >= :minCount")
    List<Object[]> findUserIdsWithActionCountAtLeast(@Param("actions") List<String> actions,
                                                        @Param("since") LocalDateTime since,
                                                        @Param("minCount") long minCount);
}
