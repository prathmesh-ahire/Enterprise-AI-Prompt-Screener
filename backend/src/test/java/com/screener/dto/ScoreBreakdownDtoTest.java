package com.screener.dto;

import com.screener.detection.RiskScorer;
import com.screener.detection.RiskSubScores;
import com.screener.model.Decision;
import com.screener.model.OverrideRule;
import com.screener.model.ScreeningDecision;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;

// V2 55.7: ScoreBreakdownDto.from - "not recorded" stays null, stored values come back in
// rule order, and the weights it reports reproduce RiskScorer's score.
class ScoreBreakdownDtoTest {

    @Test
    void returnsNullWhenThereIsNoDecision() {
        assertNull(ScoreBreakdownDto.from(null));
    }

    @Test
    void returnsNullForADecisionRecordedBeforeV2() {
        ScreeningDecision legacy = new ScreeningDecision();
        legacy.setDecision(Decision.MASK);
        legacy.setRiskScore(30.0);

        assertNull(ScoreBreakdownDto.from(legacy));
    }

    @Test
    void returnsNullWhenOnlyPartOfTheBreakdownIsPresent() {
        ScreeningDecision partial = decision(new RiskSubScores(0.1, 0.2, 0.3, 0.4, 0.5), Decision.MASK, "");
        partial.setObfuscationScore(null);

        assertNull(ScoreBreakdownDto.from(partial));
    }

    @Test
    void mapsEverySubScoreToItsWeightAndTheBand() {
        ScoreBreakdownDto dto = ScoreBreakdownDto.from(
                decision(new RiskSubScores(0.1, 0.2, 0.3, 0.4, 0.5), Decision.CONFIRM, ""));

        assertNotNull(dto);
        assertEquals("CONFIRM", dto.scoreBand());
        assertEquals(List.of(
                new ScoreBreakdownDto.Component("SENSITIVE_DATA", 0.1, RiskScorer.WEIGHT_SENSITIVE_DATA),
                new ScoreBreakdownDto.Component("INJECTION", 0.2, RiskScorer.WEIGHT_INJECTION),
                new ScoreBreakdownDto.Component("SECRET_CRITICALITY", 0.3, RiskScorer.WEIGHT_SECRET_CRITICALITY),
                new ScoreBreakdownDto.Component("POLICY_CONTEXT", 0.4, RiskScorer.WEIGHT_POLICY_CONTEXT),
                new ScoreBreakdownDto.Component("OBFUSCATION", 0.5, RiskScorer.WEIGHT_OBFUSCATION)),
                dto.components());
        assertEquals(List.of(), dto.appliedOverrides());
    }

    @Test
    void reportedWeightsReproduceTheRiskScore() {
        RiskSubScores subScores = new RiskSubScores(0.65, 0.4, 0.8, 0.5, 0.6);
        ScoreBreakdownDto dto = ScoreBreakdownDto.from(decision(subScores, Decision.CONFIRM, ""));

        double sum = 100 * dto.components().stream()
                .mapToDouble(component -> component.subScore() * component.weight())
                .sum();

        assertEquals(new RiskScorer().score(subScores), sum, 1e-9);
    }

    @Test
    void returnsStoredOverridesInRuleOrderWithTheirDescriptions() {
        ScoreBreakdownDto dto = ScoreBreakdownDto.from(decision(new RiskSubScores(0, 0, 0, 0, 0), Decision.ALLOW,
                "DETECTED_ENTITY,CRITICAL_SECRET"));

        assertEquals(List.of(
                new ScoreBreakdownDto.AppliedOverride("CRITICAL_SECRET", OverrideRule.CRITICAL_SECRET.description()),
                new ScoreBreakdownDto.AppliedOverride("DETECTED_ENTITY", OverrideRule.DETECTED_ENTITY.description())),
                dto.appliedOverrides());
    }

    @Test
    void skipsAStoredOverrideNameThatNoLongerExists() {
        ScoreBreakdownDto dto = ScoreBreakdownDto.from(decision(new RiskSubScores(0, 0, 0, 0, 0), Decision.ALLOW,
                "RETIRED_RULE,INJECTION_SIGNAL,INJECTION_SIGNAL"));

        assertEquals(List.of("INJECTION_SIGNAL"),
                dto.appliedOverrides().stream().map(ScoreBreakdownDto.AppliedOverride::rule).toList());
    }

    private ScreeningDecision decision(RiskSubScores subScores, Decision scoreBand, String appliedOverrides) {
        ScreeningDecision decision = new ScreeningDecision();
        decision.setDecision(Decision.BLOCK);
        decision.setSensitiveDataScore(subScores.sensitiveDataScore());
        decision.setInjectionScore(subScores.injectionScore());
        decision.setSecretCriticalityScore(subScores.secretCriticalityScore());
        decision.setPolicyContextScore(subScores.policyContextScore());
        decision.setObfuscationScore(subScores.obfuscationScore());
        decision.setScoreBand(scoreBand);
        decision.setAppliedOverrides(appliedOverrides);
        return decision;
    }
}
