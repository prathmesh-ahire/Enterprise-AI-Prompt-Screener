package com.screener.dto;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

/**
 * Queue listing — deliberately lighter than {@link ReviewDetailsDto}:
 * no masked text, no signal breakdown. A reviewer fetches those separately via
 * {@code GET /api/review/{requestId}/details} only for the item they're about to
 * act on, keeping the queue endpoint itself free of prompt content. {@code entityTypes}
 * (added later) is the one exception - just the type labels, still never a value -
 * the queue list itself needs to show "Entity Types Found" per row.
 */
public record ReviewQueueItemDto(
        UUID requestId,
        Long userId,
        LocalDateTime submittedAt,
        Double riskScore,
        String explanation,
        List<String> entityTypes
) {
}
