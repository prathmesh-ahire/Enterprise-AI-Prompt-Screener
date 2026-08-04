package com.screener.detection;

import com.screener.model.DetectionFinding;
import com.screener.model.EntityType;
import com.screener.model.SignalType;
import com.screener.repository.SystemConfigRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.lenient;

@ExtendWith(MockitoExtension.class)
class RiskSubScoreCalculatorTest {

    private static final double DELTA = 0.0001;

    @Mock
    private SystemConfigRepository systemConfigRepository;

    @Test
    void computesAllFiveSubScoresFromAHandPickedFindingAndSignalSet() {
        lenient().when(systemConfigRepository.findByConfigKey("max_prompt_length")).thenReturn(Optional.empty());

        RiskSubScoreCalculator calculator = new RiskSubScoreCalculator(systemConfigRepository);

        List<DetectionFinding> findings = List.of(finding(EntityType.PERSONAL_EMAIL), finding(EntityType.API_KEY));
        List<RiskSignalResult> signals = List.of(
                new RiskSignalResult("s1", SignalType.INSTRUCTION_OVERRIDE, "desc", 1.0, "evidence"),
                new RiskSignalResult("s2", SignalType.OBFUSCATION_SIGNAL, "desc", 0.6, "evidence"));

        RiskSubScores subScores = calculator.compute(findings, signals, "USER", 400);

        // sensitiveDataScore: PERSONAL_EMAIL (0.15) + API_KEY (0.5) = 0.65
        assertEquals(0.65, subScores.sensitiveDataScore(), DELTA);
        // injectionScore: INSTRUCTION_OVERRIDE weight 1.0 / normalisation 2.5 = 0.4
        assertEquals(0.4, subScores.injectionScore(), DELTA);
        // secretCriticalityScore: API_KEY present, no PRIVATE_KEY = 0.8
        assertEquals(0.8, subScores.secretCriticalityScore(), DELTA);
        // policyContextScore: USER baseline 0.3 + min(0.3, 400/2000) = 0.3 + 0.2 = 0.5
        assertEquals(0.5, subScores.policyContextScore(), DELTA);
        // obfuscationScore: max(0.6 obfuscation, 0.0 repeated-attack) = 0.6
        assertEquals(0.6, subScores.obfuscationScore(), DELTA);
    }

    @Test
    void secretExtractionSignalCountsTowardInjectionScore() {
        lenient().when(systemConfigRepository.findByConfigKey("max_prompt_length")).thenReturn(Optional.empty());
        RiskSubScoreCalculator calculator = new RiskSubScoreCalculator(systemConfigRepository);

        List<RiskSignalResult> signals = List.of(
                new RiskSignalResult("s1", SignalType.SECRET_EXTRACTION, "desc", 1.0, "evidence"));

        RiskSubScores subScores = calculator.compute(List.of(), signals, "USER", 0);

        assertEquals(0.4, subScores.injectionScore(), DELTA);
    }

    @Test
    void policyContextScoreUsesLowerBaselineForMorePrivilegedRoles() {
        lenient().when(systemConfigRepository.findByConfigKey("max_prompt_length")).thenReturn(Optional.empty());
        RiskSubScoreCalculator calculator = new RiskSubScoreCalculator(systemConfigRepository);

        assertEquals(0.3, calculator.policyContextScore("USER", 0), DELTA);
        assertEquals(0.1, calculator.policyContextScore("REVIEWER", 0), DELTA);
        assertEquals(0.0, calculator.policyContextScore("ADMIN", 0), DELTA);
    }

    @Test
    void secretCriticalityScorePrefersPrivateKeyOverApiKeyOrPassword() {
        RiskSubScoreCalculator calculator = new RiskSubScoreCalculator(systemConfigRepository);

        List<DetectionFinding> all = List.of(
                finding(EntityType.PASSWORD_SECRET), finding(EntityType.API_KEY), finding(EntityType.PRIVATE_KEY));

        assertEquals(1.0, calculator.secretCriticalityScore(all), DELTA);
        assertEquals(0.0, calculator.secretCriticalityScore(List.of(finding(EntityType.PERSONAL_EMAIL))), DELTA);
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
