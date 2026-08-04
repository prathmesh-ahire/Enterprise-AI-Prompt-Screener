package com.screener.dto;

/**
 * todo.md Phase 21.1 — counts for today, keyed off {@code ScreeningDecision.decision}
 * rather than {@code PromptRequest.status} (status changes again after confirm/review,
 * decision doesn't). {@code total} counts every decision made today, including CONFIRM,
 * even though todo.md's 5 named fields don't list a dedicated "confirm" count.
 */
public record DashboardSummaryDto(
        long total,
        long allowed,
        long masked,
        long blocked,
        long pendingReview
) {
}
