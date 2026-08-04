package com.screener.dto;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * todo.md Phase 19.1 — masked text only, never the raw prompt text.
 */
public record PromptHistoryItemDto(
        UUID requestId,
        LocalDateTime submittedAt,
        String status,
        String decision,
        Double riskScore,
        String explanation,
        String maskedText
) {
}
