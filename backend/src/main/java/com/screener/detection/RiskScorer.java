package com.screener.detection;

import org.springframework.stereotype.Component;

/**
 * Combines the 5 sub-scores (Phase 11.1) into the final 0-100 risk score, per the exact
 * weighted formula specified in todo.md 11.2.1.
 */
@Component
public class RiskScorer {

    private static final double WEIGHT_SENSITIVE_DATA = 0.35;
    private static final double WEIGHT_INJECTION = 0.25;
    private static final double WEIGHT_SECRET_CRITICALITY = 0.20;
    private static final double WEIGHT_POLICY_CONTEXT = 0.10;
    private static final double WEIGHT_OBFUSCATION = 0.10;

    public double score(RiskSubScores subScores) {
        return 100 * (
                WEIGHT_SENSITIVE_DATA * subScores.sensitiveDataScore()
                        + WEIGHT_INJECTION * subScores.injectionScore()
                        + WEIGHT_SECRET_CRITICALITY * subScores.secretCriticalityScore()
                        + WEIGHT_POLICY_CONTEXT * subScores.policyContextScore()
                        + WEIGHT_OBFUSCATION * subScores.obfuscationScore());
    }
}
