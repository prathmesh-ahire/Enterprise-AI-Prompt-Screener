package com.screener.detection;

import com.screener.model.SignalType;

/**
 * In-memory signal object produced by {@link RiskAnalysisEngine} (todo.md 10.9).
 * Distinct from the persisted {@code RiskSignal} entity, which has no {@code description}
 * column — {@code description} is the safe, canned, per-type UI text and is derivable
 * from {@code type} alone, so it doesn't need its own DB column; Phase 13.3 maps this
 * down to a {@code RiskSignal} row (requestId, signalType, weight, evidenceSpan) when
 * persisting. {@code id} is a per-instance UUID, not a DB primary key.
 */
public record RiskSignalResult(String id, SignalType type, String description, double weight, String evidenceSpan) {
}
