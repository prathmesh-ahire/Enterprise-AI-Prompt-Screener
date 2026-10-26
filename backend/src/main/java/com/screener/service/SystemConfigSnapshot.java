package com.screener.service;

import com.screener.config.SystemConfigValues;
import com.screener.detection.DetectionEngine;
import com.screener.detection.PolicyDecisionEngine;
import com.screener.detection.RiskThresholds;
import com.screener.model.EntityType;
import com.screener.model.SystemConfig;

import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * Every {@code system_config} value the screening pipeline needs, read once per prompt
 * submission.
 *
 * <p>Each value used to be fetched with its own {@code findByConfigKey} query at the moment
 * it was needed, scattered across four classes — nine reads of a table holding eight rows,
 * on every single submission, for values that cannot change midway through one.
 *
 * <p><b>Deliberately a per-request snapshot, not a cache.</b> It is built at the top of
 * {@code processPrompt} and discarded when that call returns, so an admin's policy change
 * still takes effect on the very next prompt with no eviction logic, no staleness window and
 * nothing to invalidate. The per-call-no-caching decision is preserved exactly; only
 * the number of round trips changes.
 *
 * <p>Parsing goes through {@link SystemConfigValues}, so a malformed row degrades to its
 * documented default here exactly as it did at the original call sites.
 */
public record SystemConfigSnapshot(
        int maxPromptLength,
        int policyVersion,
        Set<EntityType> disabledDetectors,
        RiskThresholds thresholds
) {

    /** Builds a snapshot from every {@code system_config} row, i.e. one query's worth. */
    public static SystemConfigSnapshot from(List<SystemConfig> rows) {
        Map<String, String> byKey = rows.stream()
                .collect(Collectors.toMap(SystemConfig::getConfigKey, SystemConfig::getConfigValue,
                        (first, second) -> first));

        return new SystemConfigSnapshot(
                intValue(byKey, PromptService.MAX_LENGTH_CONFIG_KEY, PromptService.DEFAULT_MAX_LENGTH),
                intValue(byKey, PromptService.POLICY_VERSION_CONFIG_KEY, PromptService.DEFAULT_POLICY_VERSION),
                disabledDetectors(byKey),
                new RiskThresholds(
                        intValue(byKey, PolicyDecisionEngine.MASK_THRESHOLD_KEY, PolicyDecisionEngine.DEFAULT_MASK_THRESHOLD),
                        intValue(byKey, PolicyDecisionEngine.CONFIRM_THRESHOLD_KEY, PolicyDecisionEngine.DEFAULT_CONFIRM_THRESHOLD),
                        intValue(byKey, PolicyDecisionEngine.REVIEW_THRESHOLD_KEY, PolicyDecisionEngine.DEFAULT_REVIEW_THRESHOLD),
                        intValue(byKey, PolicyDecisionEngine.BLOCK_THRESHOLD_KEY, PolicyDecisionEngine.DEFAULT_BLOCK_THRESHOLD)));
    }

    private static int intValue(Map<String, String> byKey, String key, int defaultValue) {
        return apply(byKey, key, value -> SystemConfigValues.parseInt(key, value, defaultValue), defaultValue);
    }

    private static Set<EntityType> disabledDetectors(Map<String, String> byKey) {
        String key = DetectionEngine.DISABLED_DETECTORS_CONFIG_KEY;
        return apply(byKey, key, value -> SystemConfigValues.parseEntityTypes(key, value), Set.of());
    }

    // A missing row and a blank row both mean "use the default", matching what the original
    // per-key lookups did with Optional.orElse / filter(not blank).
    private static <T> T apply(Map<String, String> byKey, String key, Function<String, T> parser, T defaultValue) {
        String raw = byKey.get(key);
        return (raw == null || raw.isBlank()) ? defaultValue : parser.apply(raw);
    }
}
