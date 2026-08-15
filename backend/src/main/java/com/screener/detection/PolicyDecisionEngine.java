package com.screener.detection;

import com.screener.config.SystemConfigValues;
import com.screener.model.Decision;
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
import java.util.stream.Collectors;

/**
 * Maps a numeric risk score to one of the 5 policy bands (todo.md 11.2.2), then applies
 * the 3 hard override rules (11.2.3) that can escalate — never downgrade — the band
 * regardless of the numeric score.
 *
 * <p>The REVIEW/CONFIRM split at 65 is this project's own implementation choice — the
 * source project document only specifies one combined "High 50-74 -> Confirm or Review"
 * band. Say so at viva, don't present it as taken directly from the doc.
 *
 * <p>The 4 band boundaries are read from {@code system_config} (falling back to the
 * defaults above) so Phase 20.3's admin policy PUT can actually change them, same
 * pattern as {@code DetectionEngine}'s per-detector toggle.
 */
@Component
@RequiredArgsConstructor
public class PolicyDecisionEngine {

    // Public: AdminService (Phase 20.3) reads/writes these same keys and defaults.
    public static final String MASK_THRESHOLD_KEY = "risk_threshold_mask";
    public static final String CONFIRM_THRESHOLD_KEY = "risk_threshold_confirm";
    public static final String REVIEW_THRESHOLD_KEY = "risk_threshold_review";
    public static final String BLOCK_THRESHOLD_KEY = "risk_threshold_block";
    public static final int DEFAULT_MASK_THRESHOLD = 25;
    public static final int DEFAULT_CONFIRM_THRESHOLD = 50;
    public static final int DEFAULT_REVIEW_THRESHOLD = 65;
    public static final int DEFAULT_BLOCK_THRESHOLD = 75;

    private final SystemConfigRepository systemConfigRepository;

    private static final Map<Decision, String> EXPLANATIONS = Map.of(
            Decision.ALLOW,
            "This prompt appears safe. It was sent to the AI model without any changes.",
            Decision.MASK,
            "This prompt contains sensitive information that has been automatically masked. "
                    + "Please review the masked version before it is sent to the AI model.",
            Decision.CONFIRM,
            "This prompt has an elevated risk score. Please review it and confirm before it is sent "
                    + "to the AI model.",
            Decision.REVIEW,
            "This prompt has been flagged for human review due to a possible policy violation or "
                    + "prompt-injection attempt. A reviewer will assess it before anything is sent to the AI model.",
            Decision.BLOCK,
            "This prompt was blocked because it contains a critical secret (such as a private key or "
                    + "API key) or was assessed as too high-risk to proceed. Please remove the sensitive "
                    + "content and try again.");

    private static final Map<Decision, String> SAFE_ACTIONS = Map.of(
            Decision.ALLOW, "Sent to the AI model automatically.",
            Decision.MASK, "Awaiting your confirmation to send the masked version.",
            Decision.CONFIRM, "Awaiting your confirmation to send.",
            Decision.REVIEW, "Sent to a human reviewer.",
            Decision.BLOCK, "Not sent anywhere.");

    /** Reads the four thresholds itself. Kept for tests and any non-pipeline caller. */
    public DecisionResult decide(double riskScore, List<DetectionFinding> findings, List<RiskSignalResult> signals) {
        return decide(riskScore, findings, signals, loadThresholds());
    }

    // 43.2/43.3: the prompt pipeline passes thresholds in from the per-request snapshot, so a
    // decision costs zero config queries instead of up to four.
    public DecisionResult decide(double riskScore, List<DetectionFinding> findings,
                                  List<RiskSignalResult> signals, RiskThresholds thresholds) {
        Decision decision = bandFor(riskScore, thresholds);

        Set<EntityType> entityTypes = findings.stream()
                .map(DetectionFinding::getEntityType)
                .collect(Collectors.toSet());
        Set<SignalType> signalTypes = signals.stream()
                .map(RiskSignalResult::type)
                .collect(Collectors.toSet());

        if (entityTypes.contains(EntityType.PRIVATE_KEY) || entityTypes.contains(EntityType.API_KEY)) {
            decision = atLeast(decision, Decision.BLOCK);
        }
        if (signalTypes.contains(SignalType.INSTRUCTION_OVERRIDE) || signalTypes.contains(SignalType.POLICY_BYPASS)) {
            decision = atLeast(decision, Decision.REVIEW);
        }
        if (entityTypes.contains(EntityType.PASSWORD_SECRET)) {
            decision = atLeast(decision, Decision.MASK);
        }

        return new DecisionResult(decision, riskScore, EXPLANATIONS.get(decision), SAFE_ACTIONS.get(decision));
    }

    private Decision bandFor(double riskScore, RiskThresholds thresholds) {
        if (riskScore >= thresholds.block()) {
            return Decision.BLOCK;
        }
        if (riskScore >= thresholds.review()) {
            return Decision.REVIEW;
        }
        if (riskScore >= thresholds.confirm()) {
            return Decision.CONFIRM;
        }
        if (riskScore >= thresholds.mask()) {
            return Decision.MASK;
        }
        return Decision.ALLOW;
    }

    private RiskThresholds loadThresholds() {
        return new RiskThresholds(
                resolveThreshold(MASK_THRESHOLD_KEY, DEFAULT_MASK_THRESHOLD),
                resolveThreshold(CONFIRM_THRESHOLD_KEY, DEFAULT_CONFIRM_THRESHOLD),
                resolveThreshold(REVIEW_THRESHOLD_KEY, DEFAULT_REVIEW_THRESHOLD),
                resolveThreshold(BLOCK_THRESHOLD_KEY, DEFAULT_BLOCK_THRESHOLD));
    }

    // 42.3: a non-numeric threshold row used to throw here on every prompt submission.
    private int resolveThreshold(String key, int defaultValue) {
        return systemConfigRepository.findByConfigKey(key)
                .map(SystemConfig::getConfigValue)
                .map(value -> SystemConfigValues.parseInt(key, value, defaultValue))
                .orElse(defaultValue);
    }

    private Decision atLeast(Decision current, Decision floor) {
        return current.ordinal() >= floor.ordinal() ? current : floor;
    }
}
