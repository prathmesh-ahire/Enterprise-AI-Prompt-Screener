package com.screener.service;

import com.screener.model.AuditEvent;
import com.screener.repository.AuditEventRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Single write path for {@code audit_events} (todo.md 17.1). Every other class that
 * needs to record an audit event goes through this now — Phase 16's
 * {@code ResponseSafetyChecker} and Phase 5.1.6's {@code AuthService.logout} used to
 * write {@link AuditEvent} rows directly (built before this class existed); both are
 * folded into this shared path as part of Phase 17, per the note left in docs/NOTE.md
 * when Phase 16 was built.
 *
 * <p>17.1's task text calls the last parameter "metadata", but 17.3 pins storage down
 * to exactly {@code userId, action, createdAt, requestId, riskBand} — no free-form
 * metadata column exists on {@link AuditEvent}. Named {@code riskBand} here to match
 * the entity and 17.3 exactly rather than invent an unused field.
 *
 * <p>{@code action} is a free-form string, but {@code "BLOCK"} and {@code "REVIEW"} are
 * load-bearing literals — {@code RiskAnalysisEngine}'s Repeated-Attack-Pattern check
 * (Phase 10.8) queries {@code audit_events} for exactly those two strings. Never rename
 * them without also updating that query.
 */
@Service
@RequiredArgsConstructor
public class AuditService {

    private final AuditEventRepository auditEventRepository;

    public void log(Long userId, String action, UUID requestId, String riskBand) {
        AuditEvent event = new AuditEvent();
        event.setUserId(userId);
        event.setAction(action);
        event.setRequestId(requestId);
        event.setRiskBand(riskBand);
        event.setCreatedAt(LocalDateTime.now());
        auditEventRepository.save(event);
    }
}
