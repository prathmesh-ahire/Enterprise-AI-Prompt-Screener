package com.screener.detection;

import com.screener.model.Decision;
import com.screener.model.DetectionFinding;
import com.screener.model.EntityType;
import com.screener.model.SignalType;
import com.screener.repository.SystemConfigRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
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
