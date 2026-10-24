package com.screener.detection;

import com.screener.model.Decision;
import com.screener.model.DetectionFinding;
import com.screener.model.EntityType;
import com.screener.model.OverrideRule;
import com.screener.model.SignalType;
import com.screener.repository.SystemConfigRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
import org.junit.jupiter.params.provider.ValueSource;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.lenient;

@ExtendWith(MockitoExtension.class)
class PolicyDecisionEngineTest {

    @Mock private SystemConfigRepository systemConfigRepository;

    private PolicyDecisionEngine engine;

    // Empty repo -> every threshold falls back to its default (25/50/65/75), matching
    // the behaviour before thresholds became system_config-driven (20.3).
    @BeforeEach
    void setUp() {
        engine = new PolicyDecisionEngine(systemConfigRepository);
        lenient().when(systemConfigRepository.findByConfigKey(anyString())).thenReturn(Optional.empty());
    }

    @Test
    void mapsScoreToEachOfTheFiveBandsWhenNoOverridesApply() {
        assertEquals(Decision.ALLOW, decide(0));
        assertEquals(Decision.ALLOW, decide(24));
        assertEquals(Decision.MASK, decide(25));
        assertEquals(Decision.MASK, decide(49));
        assertEquals(Decision.CONFIRM, decide(50));
        assertEquals(Decision.CONFIRM, decide(64));
        assertEquals(Decision.REVIEW, decide(65));
        assertEquals(Decision.REVIEW, decide(74));
        assertEquals(Decision.BLOCK, decide(75));
        assertEquals(Decision.BLOCK, decide(100));
    }

    @Test
    void privateKeyAlwaysBlocksRegardlessOfScore() {
        assertEquals(Decision.BLOCK, engine.decide(0.0, List.of(finding(EntityType.PRIVATE_KEY)), List.of()).decision());
    }

    @Test
    void apiKeyAlwaysBlocksRegardlessOfScore() {
        assertEquals(Decision.BLOCK, engine.decide(0.0, List.of(finding(EntityType.API_KEY)), List.of()).decision());
    }

    @Test
    void instructionOverrideSignalForcesAtLeastReview() {
        RiskSignalResult signal = new RiskSignalResult("s1", SignalType.INSTRUCTION_OVERRIDE, "desc", 1.0, "ev");
        assertEquals(Decision.REVIEW, engine.decide(0.0, List.of(), List.of(signal)).decision());
    }

    @Test
    void policyBypassSignalForcesAtLeastReview() {
        RiskSignalResult signal = new RiskSignalResult("s1", SignalType.POLICY_BYPASS, "desc", 1.0, "ev");
        assertEquals(Decision.REVIEW, engine.decide(0.0, List.of(), List.of(signal)).decision());
    }

    @Test
    void passwordSecretForcesAtLeastMask() {
        assertEquals(Decision.MASK, engine.decide(0.0, List.of(finding(EntityType.PASSWORD_SECRET)), List.of()).decision());
    }

    // ---------------------------------------------------------------------
    // Phase 51.1 - ANY detected entity forces at least MASK.
    //
    // The score alone could not protect a single piece of sensitive data: one HIGH finding
    // is worth ~10.5 points against a MASK floor of 25, so it took roughly two of them
    // before anything was masked. A recall audit confirmed the consequence live - a lone
    // payment card was detected and then ALLOWed, i.e. forwarded to the model in full.
    // These cases exist so that can never silently come back.
    // ---------------------------------------------------------------------
    @ParameterizedTest
    @EnumSource(EntityType.class)
    void anySingleDetectedEntityForcesAtLeastMask(EntityType type) {
        // Score 0.0 is deep in the ALLOW band - only the override can lift this.
        Decision decision = engine.decide(0.0, List.of(finding(type)), List.of()).decision();
        assertNotEquals(Decision.ALLOW, decision,
                type + " alone must never be forwarded unmasked");
    }

    @Test
    void aLonePaymentCardIsMaskedEvenThoughItScoresFarBelowTheMaskFloor() {
        // The exact case the audit caught: "My card number is 4111 1111 1111 1111" scored
        // 16.8 against a floor of 25, and was ALLOWed.
        assertEquals(Decision.MASK, engine.decide(16.8, List.of(finding(EntityType.PAYMENT_CARD)), List.of()).decision());
    }

    @Test
    void aLoneEmailIsMaskedRatherThanAllowed() {
        // Supersedes the long-documented "a lone email genuinely decides ALLOW, by design"
        // behaviour - see the Phase 51 note in todo.md for why that was retired.
        assertEquals(Decision.MASK, engine.decide(8.5, List.of(finding(EntityType.PERSONAL_EMAIL)), List.of()).decision());
    }

    @Test
    void aPromptWithNoFindingsAtAllIsStillAllowed() {
        // The rule keys on findings, not on the score - a genuinely clean prompt must not
        // be dragged into MASK by it.
        assertEquals(Decision.ALLOW, engine.decide(3.15, List.of(), List.of()).decision());
    }

    @Test
    void theMaskFloorNeverDowngradesAHigherBand() {
        DetectionFinding email = finding(EntityType.PERSONAL_EMAIL);
        assertEquals(Decision.CONFIRM, engine.decide(55.0, List.of(email), List.of()).decision());
        assertEquals(Decision.REVIEW, engine.decide(70.0, List.of(email), List.of()).decision());
        assertEquals(Decision.BLOCK, engine.decide(80.0, List.of(email), List.of()).decision());
    }

    @Test
    void overridesNeverDowngradeAScoreThatIsAlreadyAboveTheFloor() {
        // score 80 is already BLOCK band; PASSWORD_SECRET's "at least MASK" floor must not downgrade it
        DetectionFinding password = finding(EntityType.PASSWORD_SECRET);
        assertEquals(Decision.BLOCK, engine.decide(80.0, List.of(password), List.of()).decision());
    }

    @Test
    void fullPipelineFromHandComputedSubScoresProducesExpectedFinalBand() {
        // Same hand-picked example as RiskSubScoreCalculatorTest/RiskScorerTest:
        // sub-scores (0.65, 0.4, 0.8, 0.5, 0.6) -> raw score 59.75 (CONFIRM band by score
        // alone), but the API_KEY finding present triggers the hard BLOCK override.
        RiskScorer scorer = new RiskScorer();
        double score = scorer.score(new RiskSubScores(0.65, 0.4, 0.8, 0.5, 0.6));

        List<DetectionFinding> findings = List.of(finding(EntityType.PERSONAL_EMAIL), finding(EntityType.API_KEY));
        List<RiskSignalResult> signals = List.of(
                new RiskSignalResult("s1", SignalType.INSTRUCTION_OVERRIDE, "desc", 1.0, "ev"));

        DecisionResult result = engine.decide(score, findings, signals);

        assertEquals(59.75, result.riskScore(), 0.0001);
        assertEquals(Decision.BLOCK, result.decision());
    }

    // ---------------------------------------------------------------------
    // V2 55.7: scoreBand and appliedOverrides record what happened - for each rule, one
    // case where it raises the decision and one where it matches but the decision is
    // already at or above its floor, so it is not "applied".
    // ---------------------------------------------------------------------

    @Test
    void criticalSecretRuleIsRecordedWhenItRaisesTheDecision() {
        DecisionResult result = engine.decide(0.0, List.of(finding(EntityType.API_KEY)), List.of());

        assertEquals(Decision.ALLOW, result.scoreBand());
        assertEquals(Decision.BLOCK, result.decision());
        // DETECTED_ENTITY also matched, but BLOCK was already above its MASK floor.
        assertEquals(List.of(OverrideRule.CRITICAL_SECRET), result.appliedOverrides());
    }

    @Test
    void criticalSecretRuleIsNotRecordedWhenTheScoreAlreadyBlocks() {
        DecisionResult result = engine.decide(80.0, List.of(finding(EntityType.PRIVATE_KEY)), List.of());

        assertEquals(Decision.BLOCK, result.scoreBand());
        assertEquals(Decision.BLOCK, result.decision());
        assertEquals(List.of(), result.appliedOverrides());
    }

    @Test
    void injectionRuleIsRecordedWhenItRaisesTheDecision() {
        DecisionResult result = engine.decide(13.0, List.of(), List.of(signal(SignalType.INSTRUCTION_OVERRIDE)));

        assertEquals(Decision.ALLOW, result.scoreBand());
        assertEquals(Decision.REVIEW, result.decision());
        assertEquals(List.of(OverrideRule.INJECTION_SIGNAL), result.appliedOverrides());
    }

    @Test
    void injectionRuleIsNotRecordedWhenTheScoreIsAlreadyAtReview() {
        DecisionResult result = engine.decide(70.0, List.of(), List.of(signal(SignalType.POLICY_BYPASS)));

        assertEquals(Decision.REVIEW, result.scoreBand());
        assertEquals(Decision.REVIEW, result.decision());
        assertEquals(List.of(), result.appliedOverrides());
    }

    @Test
    void detectedEntityRuleIsRecordedWhenItRaisesTheDecision() {
        DecisionResult result = engine.decide(8.5, List.of(finding(EntityType.PERSONAL_EMAIL)), List.of());

        assertEquals(Decision.ALLOW, result.scoreBand());
        assertEquals(Decision.MASK, result.decision());
        assertEquals(List.of(OverrideRule.DETECTED_ENTITY), result.appliedOverrides());
    }

    @Test
    void detectedEntityRuleIsNotRecordedWhenTheScoreIsAlreadyAtMask() {
        DecisionResult result = engine.decide(30.0, List.of(finding(EntityType.PERSONAL_EMAIL)), List.of());

        assertEquals(Decision.MASK, result.scoreBand());
        assertEquals(Decision.MASK, result.decision());
        assertEquals(List.of(), result.appliedOverrides());
    }

    @Test
    void onlyTheRuleThatRaisedTheDecisionIsRecordedWhenSeveralMatch() {
        // Injection raises ALLOW to REVIEW; the email then matches DETECTED_ENTITY, but
        // REVIEW is already above MASK.
        DecisionResult result = engine.decide(0.0, List.of(finding(EntityType.PERSONAL_EMAIL)),
                List.of(signal(SignalType.INSTRUCTION_OVERRIDE)));

        assertEquals(Decision.REVIEW, result.decision());
        assertEquals(List.of(OverrideRule.INJECTION_SIGNAL), result.appliedOverrides());
    }

    @Test
    void injectionRuleIsNotRecordedWhenTheSecretRuleAlreadyBlocked() {
        DecisionResult result = engine.decide(0.0, List.of(finding(EntityType.API_KEY)),
                List.of(signal(SignalType.INSTRUCTION_OVERRIDE)));

        assertEquals(Decision.BLOCK, result.decision());
        assertEquals(List.of(OverrideRule.CRITICAL_SECRET), result.appliedOverrides());
    }

    @ParameterizedTest
    @ValueSource(doubles = {0, 24, 25, 49, 50, 64, 65, 74, 75, 100})
    void scoreBandEqualsTheDecisionWhenNoOverrideApplies(double score) {
        DecisionResult result = engine.decide(score, List.of(), List.of());

        assertEquals(result.decision(), result.scoreBand());
        assertEquals(List.of(), result.appliedOverrides());
    }

    private RiskSignalResult signal(SignalType type) {
        return new RiskSignalResult("s1", type, "desc", 1.0, "ev");
    }

    private Decision decide(double score) {
        return engine.decide(score, List.of(), List.of()).decision();
    }

    private DetectionFinding finding(EntityType type) {
        DetectionFinding finding = new DetectionFinding();
        finding.setEntityType(type);
        finding.setStartPos(0);
        finding.setEndPos(5);
        finding.setConfidence(0.9);
        return finding;
    }
}
