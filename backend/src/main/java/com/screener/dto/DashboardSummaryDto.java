package com.screener.dto;

/**
 * todo.md Phase 21.1 — counts for today, keyed off {@code ScreeningDecision.decision}
 * rather than {@code PromptRequest.status} (status changes again after confirm/review,
 * decision doesn't).
 *
 * <p>Phase 41.6 added {@code confirm}. {@code total} has always summed every decision
 * type, but CONFIRM had no field of its own — so the exported report's Summary block
 * listed four categories that could not add up to the Total it printed directly above
 * them (e.g. Total 118 against 68+11+28+7=114). The five category fields now account for
 * every decision the total counts.
 */
public record DashboardSummaryDto(
        long total,
        long allowed,
        long masked,
        long confirm,
        long blocked,
        long pendingReview
) {
}
