package com.screener.detection;

import com.screener.model.Decision;
import com.screener.model.OverrideRule;

import java.util.List;

/**
 * Output of {@link PolicyDecisionEngine}. {@code explanation} is the
 * plain-English, safe-to-show text for the band; {@code safeAction} is a short
 * human-readable statement of what happens to the prompt next.
 *
 * <p>Added {@code scoreBand} - the band the score alone gives, before any
 * override - and {@code appliedOverrides}, the rules that actually raised the decision
 * above it, in rule order. A rule whose condition matched but found the decision already
 * at or above its floor is not in the list.
 */
public record DecisionResult(Decision decision, double riskScore, String explanation, String safeAction,
                             Decision scoreBand, List<OverrideRule> appliedOverrides) {

    public DecisionResult {
        appliedOverrides = List.copyOf(appliedOverrides);
    }

    // For callers that only care about the outcome (test doubles mostly): no override
    // applied, so the score band is the decision itself.
    public DecisionResult(Decision decision, double riskScore, String explanation, String safeAction) {
        this(decision, riskScore, explanation, safeAction, decision, List.of());
    }
}
