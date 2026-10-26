package com.screener.dto;

import com.screener.detection.RiskScorer;
import com.screener.model.OverrideRule;
import com.screener.model.ScreeningDecision;

import java.util.Arrays;
import java.util.List;
import java.util.Set;

/**
 * why a prompt got its score and decision: each of the five sub-scores
 * with its formula weight, the band the score alone gave, and the hard overrides that
 * raised the decision above that band.
 *
 * <p>Numbers and fixed rule identifiers only - nothing in here is ever derived from the
 * prompt text, so it is as safe to return as the entity-type labels beside it.
 *
 * <p>Weights come from {@link RiskScorer}'s own constants, so a client can render the
 * formula without hard-coding it: sum of {@code subScore * weight}, times 100, is the
 * risk score.
 */
public record ScoreBreakdownDto(
        List<Component> components,
        String scoreBand,
        List<AppliedOverride> appliedOverrides
) {

    public record Component(String name, double subScore, double weight) {
    }

    public record AppliedOverride(String rule, String description) {
    }

    /**
     * Null when the decision predates V2 (no breakdown was recorded), never a breakdown
     * of zeros - "not recorded" and "scored zero" must stay distinguishable.
     */
    public static ScoreBreakdownDto from(ScreeningDecision decision) {
        if (decision == null || decision.getScoreBand() == null || decision.getAppliedOverrides() == null
                || decision.getSensitiveDataScore() == null || decision.getInjectionScore() == null
                || decision.getSecretCriticalityScore() == null || decision.getPolicyContextScore() == null
                || decision.getObfuscationScore() == null) {
            return null;
        }

        List<Component> components = List.of(
                new Component("SENSITIVE_DATA", decision.getSensitiveDataScore(), RiskScorer.WEIGHT_SENSITIVE_DATA),
                new Component("INJECTION", decision.getInjectionScore(), RiskScorer.WEIGHT_INJECTION),
                new Component("SECRET_CRITICALITY", decision.getSecretCriticalityScore(),
                        RiskScorer.WEIGHT_SECRET_CRITICALITY),
                new Component("POLICY_CONTEXT", decision.getPolicyContextScore(), RiskScorer.WEIGHT_POLICY_CONTEXT),
                new Component("OBFUSCATION", decision.getObfuscationScore(), RiskScorer.WEIGHT_OBFUSCATION));

        // Walk the enum rather than the stored string, so the list comes out in rule order
        // and a name that no longer exists is skipped instead of failing the whole response.
        // Set.copyOf, not Set.of: Set.of throws on a duplicate, and this reads stored data.
        Set<String> storedNames = Set.copyOf(Arrays.asList(decision.getAppliedOverrides().split(",")));
        List<AppliedOverride> overrides = Arrays.stream(OverrideRule.values())
                .filter(rule -> storedNames.contains(rule.name()))
                .map(rule -> new AppliedOverride(rule.name(), rule.description()))
                .toList();

        return new ScoreBreakdownDto(components, decision.getScoreBand().name(), overrides);
    }
}
