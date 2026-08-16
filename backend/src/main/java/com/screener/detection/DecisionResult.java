package com.screener.detection;

import com.screener.model.Decision;

/**
 * Output of {@link PolicyDecisionEngine} (todo.md 11.2.4). {@code explanation} is the
 * plain-English, safe-to-show text for the band; {@code safeAction} is a short
 * human-readable statement of what happens to the prompt next.
 */
public record DecisionResult(Decision decision, double riskScore, String explanation, String safeAction) {
}
