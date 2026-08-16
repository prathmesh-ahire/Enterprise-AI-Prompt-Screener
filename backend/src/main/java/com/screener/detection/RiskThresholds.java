package com.screener.detection;

/**
 * The four risk-band boundaries, resolved once instead of one database read per band
 * (todo.md V1.1 Phase 43.2).
 *
 * <p>{@link PolicyDecisionEngine#bandFor} tests the bands in descending order, and each test
 * used to issue its own {@code findByConfigKey} query — so a single decision cost up to four
 * round trips to read four small integers that cannot change mid-decision.
 */
public record RiskThresholds(int mask, int confirm, int review, int block) {

    public static RiskThresholds defaults() {
        return new RiskThresholds(
                PolicyDecisionEngine.DEFAULT_MASK_THRESHOLD,
                PolicyDecisionEngine.DEFAULT_CONFIRM_THRESHOLD,
                PolicyDecisionEngine.DEFAULT_REVIEW_THRESHOLD,
                PolicyDecisionEngine.DEFAULT_BLOCK_THRESHOLD);
    }
}
