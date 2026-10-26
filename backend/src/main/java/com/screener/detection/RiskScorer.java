package com.screener.detection;

import org.springframework.stereotype.Component;

/**
 * Combines the 5 sub-scores into the final 0-100 risk score, per the exact
 * weighted formula from the project specification.
 */
@Component
public class RiskScorer {

    // Public so that ScoreBreakdownDto returns these beside each sub-score, so the
    // formula has one source of truth instead of a copy in the frontend.
    public static final double WEIGHT_SENSITIVE_DATA = 0.35;
    public static final double WEIGHT_INJECTION = 0.25;
    public static final double WEIGHT_SECRET_CRITICALITY = 0.20;
    public static final double WEIGHT_POLICY_CONTEXT = 0.10;
    public static final double WEIGHT_OBFUSCATION = 0.10;

    public double score(RiskSubScores subScores) {
        return 100 * (
                WEIGHT_SENSITIVE_DATA * subScores.sensitiveDataScore()
                        + WEIGHT_INJECTION * subScores.injectionScore()
                        + WEIGHT_SECRET_CRITICALITY * subScores.secretCriticalityScore()
                        + WEIGHT_POLICY_CONTEXT * subScores.policyContextScore()
                        + WEIGHT_OBFUSCATION * subScores.obfuscationScore());
    }
}
