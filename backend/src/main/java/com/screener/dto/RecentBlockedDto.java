package com.screener.dto;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * todo.md Phase 21.4 — requestId, time, risk score, triggering entity type. No raw text.
 * {@code triggeringEntityType} is null when the request was blocked purely by numeric
 * score/signal override with no PII/secret finding at all (e.g. an injection-only prompt
 * that also happened to score above the BLOCK threshold).
 */
public record RecentBlockedDto(
        UUID requestId,
        LocalDateTime timestamp,
        Double riskScore,
        String triggeringEntityType
) {
}
