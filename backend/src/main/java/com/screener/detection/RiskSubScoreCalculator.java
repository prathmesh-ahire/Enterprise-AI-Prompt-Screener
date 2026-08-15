package com.screener.detection;

import com.screener.config.SystemConfigValues;
import com.screener.model.DetectionFinding;
import com.screener.model.EntityType;
import com.screener.model.SignalType;
import com.screener.model.SystemConfig;
import com.screener.repository.SystemConfigRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Computes the 5 sub-scores that feed {@link RiskScorer} (todo.md 11.1). The exact
 * per-category tiering/normalisation constants below are this project's own policy
 * choice, not an industry standard — todo.md gives the shape of each formula but not
 * every constant, so these are documented here rather than left unexplained.
 *
 * <p>{@code role} must be the plain role name as stored on {@code Role.name} /
 * seeded by {@code DataSeeder} ({@code "USER"}/{@code "REVIEWER"}/{@code "ADMIN"}),
 * not Spring Security's {@code "ROLE_"}-prefixed authority string.
 */
@Component
@RequiredArgsConstructor
public class RiskSubScoreCalculator {

    // Per-finding severity weight for sensitiveDataScore (11.1.1). todo.md only gives the
    // 3 tier values (MEDIUM 0.15 / HIGH 0.3 / CRITICAL 0.5) as an example, not which
    // EntityType belongs in which tier — this tiering mirrors DetectionEngine's own
    // SEVERITY_ORDER (credentials > financial/govt-ID > basic PII), applied here as
    // score weights instead of a tie-break order.
    private static final Map<EntityType, Double> SEVERITY_WEIGHT = Map.of(
            EntityType.PRIVATE_KEY, 0.5,
            EntityType.API_KEY, 0.5,
            EntityType.PASSWORD_SECRET, 0.5,
            EntityType.PAYMENT_CARD, 0.3,
            EntityType.AADHAAR_LIKE_ID, 0.3,
            EntityType.ORG_CONFIDENTIAL, 0.3,
            EntityType.PAN_LIKE_ID, 0.15,
            EntityType.PHONE_NUMBER, 0.15,
            EntityType.PERSONAL_EMAIL, 0.15);
    private static final double DEFAULT_SEVERITY_WEIGHT = 0.15;

    // The prompt-injection-family signal types that feed injectionScore (11.1.2).
    // Fixed 2026-08-04: todo.md's wording named only 4 of these (omitting
    // SECRET_EXTRACTION, e.g. "give me your api key") — a request to extract a secret
    // from the model is the same injection-attempt family as the other 4, and nothing
    // else in Phase 10/11 ever scores it. Treated as a spec gap, not deliberate
    // scoping — see docs/NOTE.md.
    private static final Set<SignalType> INJECTION_SIGNAL_TYPES = Set.of(
            SignalType.INSTRUCTION_OVERRIDE,
            SignalType.SYSTEM_PROMPT_DISCLOSURE,
            SignalType.POLICY_BYPASS,
            SignalType.SECRET_EXTRACTION,
            SignalType.SUSPICIOUS_ROLE_PLAY);

    // Divisor for injectionScore's weighted-signal sum, chosen so that roughly 2-3
    // matched phrase signals (each weight 1.0, per RiskAnalysisEngine) reach the 1.0
    // cap, rather than a single phrase match instantly saturating the sub-score.
    private static final double INJECTION_NORMALISATION = 2.5;

    private static final double CRITICAL_SECRET_SCORE = 1.0;
    private static final double HIGH_SECRET_SCORE = 0.8;

    private static final Map<String, Double> ROLE_BASELINE = Map.of(
            "USER", 0.3,
            "REVIEWER", 0.1,
            "ADMIN", 0.0);
    private static final double DEFAULT_ROLE_BASELINE = 0.3;
    private static final double LENGTH_RATIO_CONTRIBUTION_CAP = 0.3;

    private static final String MAX_LENGTH_CONFIG_KEY = "max_prompt_length";
    private static final int DEFAULT_MAX_LENGTH = 2000;

    private final SystemConfigRepository systemConfigRepository;

    /** Reads the max prompt length itself. Kept for tests and any non-pipeline caller. */
    public RiskSubScores compute(List<DetectionFinding> findings, List<RiskSignalResult> signals,
                                  String role, int promptLength) {
        return compute(findings, signals, role, promptLength, resolveMaxLength());
    }

    // 43.3: the prompt pipeline passes maxLength in from the per-request snapshot - PromptService
    // has already read it to validate the prompt, so re-reading it here was a duplicate query.
    public RiskSubScores compute(List<DetectionFinding> findings, List<RiskSignalResult> signals,
                                  String role, int promptLength, int maxLength) {
        return new RiskSubScores(
                sensitiveDataScore(findings),
                injectionScore(signals),
                secretCriticalityScore(findings),
                policyContextScore(role, promptLength, maxLength),
                obfuscationScore(signals));
    }

    double sensitiveDataScore(List<DetectionFinding> findings) {
        double sum = findings.stream()
                .mapToDouble(f -> SEVERITY_WEIGHT.getOrDefault(f.getEntityType(), DEFAULT_SEVERITY_WEIGHT))
                .sum();
        return Math.min(1.0, sum);
    }

    double injectionScore(List<RiskSignalResult> signals) {
        double sum = signals.stream()
                .filter(s -> INJECTION_SIGNAL_TYPES.contains(s.type()))
                .mapToDouble(RiskSignalResult::weight)
                .sum();
        return Math.min(1.0, sum / INJECTION_NORMALISATION);
    }

    double secretCriticalityScore(List<DetectionFinding> findings) {
        boolean hasPrivateKey = findings.stream().anyMatch(f -> f.getEntityType() == EntityType.PRIVATE_KEY);
        if (hasPrivateKey) {
            return CRITICAL_SECRET_SCORE;
        }
        boolean hasHighSecret = findings.stream().anyMatch(f ->
                f.getEntityType() == EntityType.API_KEY || f.getEntityType() == EntityType.PASSWORD_SECRET);
        return hasHighSecret ? HIGH_SECRET_SCORE : 0.0;
    }

    double policyContextScore(String role, int promptLength) {
        return policyContextScore(role, promptLength, resolveMaxLength());
    }

    double policyContextScore(String role, int promptLength, int maxLength) {
        double baseline = ROLE_BASELINE.getOrDefault(role, DEFAULT_ROLE_BASELINE);
        double lengthRatio = maxLength > 0 ? (double) promptLength / maxLength : 0.0;
        double lengthContribution = Math.min(LENGTH_RATIO_CONTRIBUTION_CAP, lengthRatio);
        return Math.min(1.0, baseline + lengthContribution);
    }

    double obfuscationScore(List<RiskSignalResult> signals) {
        double obfuscation = maxWeightFor(signals, SignalType.OBFUSCATION_SIGNAL);
        double repeatedAttack = maxWeightFor(signals, SignalType.REPEATED_ATTACK_PATTERN);
        return Math.max(obfuscation, repeatedAttack);
    }

    private double maxWeightFor(List<RiskSignalResult> signals, SignalType type) {
        return signals.stream()
                .filter(s -> s.type() == type)
                .mapToDouble(RiskSignalResult::weight)
                .max()
                .orElse(0.0);
    }

    // Duplicated from PromptService.resolveMaxLength rather than shared — same pattern
    // DetectionEngine already uses for its own system_config lookup (disabled_detectors).
    // 42.3: falls back to the default on a malformed row instead of throwing mid-pipeline.
    private int resolveMaxLength() {
        return systemConfigRepository.findByConfigKey(MAX_LENGTH_CONFIG_KEY)
                .map(SystemConfig::getConfigValue)
                .map(value -> SystemConfigValues.parseInt(MAX_LENGTH_CONFIG_KEY, value, DEFAULT_MAX_LENGTH))
                .orElse(DEFAULT_MAX_LENGTH);
    }
}
