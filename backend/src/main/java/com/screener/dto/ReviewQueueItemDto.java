package com.screener.dto;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * todo.md Phase 18.1's queue listing — deliberately lighter than {@link ReviewDetailsDto}:
 * no masked text, no entity/signal breakdown. A reviewer fetches those separately via
 * {@code GET /api/review/{requestId}/details} (18.5) only for the item they're about to
 * act on, keeping the queue endpoint itself free of any prompt content.
 */
public record ReviewQueueItemDto(
        UUID requestId,
        Long userId,
        LocalDateTime submittedAt,
        Double riskScore,
        String explanation
) {
}
