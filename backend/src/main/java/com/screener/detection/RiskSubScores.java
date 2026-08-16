package com.screener.detection;

/**
 * The 5 sub-scores (each 0-1) that {@link RiskScorer} combines into the final 0-100
 * risk score (todo.md 11.1/11.2.1).
 */
public record RiskSubScores(
        double sensitiveDataScore,
        double injectionScore,
        double secretCriticalityScore,
        double policyContextScore,
        double obfuscationScore) {
}
