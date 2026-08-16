package com.screener.evaluation;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.screener.detection.DetectionEngine;
import com.screener.detection.DecisionResult;
import com.screener.detection.PolicyDecisionEngine;
import com.screener.detection.RiskAnalysisEngine;
import com.screener.detection.RiskScorer;
import com.screener.detection.RiskSignalResult;
import com.screener.detection.RiskSubScoreCalculator;
import com.screener.detection.RiskSubScores;
import com.screener.model.DetectionFinding;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.core.io.ClassPathResource;
import org.springframework.test.context.ActiveProfiles;

import java.io.IOException;
import java.io.InputStream;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;

/**
 * todo.md Phase 39 - loads {@code test-prompts.json} (39.1/39.2, 20 synthetic prompts) and
 * runs each one through the real screening pipeline, then reports pass/fail per prompt plus
 * aggregate precision/recall/F1 for entity detection (39.4).
 *
 * <p>39.3's own wording names only {@code DetectionEngine} + {@code PolicyDecisionEngine},
 * but {@code PolicyDecisionEngine.decide} also needs a risk score and the signal list to
 * produce a realistic decision (its REVIEW override, for the injection-category prompts,
 * is keyed off {@code RiskSignalResult}s that only {@link RiskAnalysisEngine} produces) -
 * so this also wires in {@code RiskAnalysisEngine}/{@code RiskSubScoreCalculator}/
 * {@code RiskScorer}, the same real-bean, Ollama-excluded scope Phase 38's
 * {@code ScreeningPipelineLatencyTest} already uses. See docs/NOTE.md.
 *
 * <p>Per 39.5 ("review the report... tell the AI agent which detector to fix"), reviewing
 * and acting on a low score is explicitly a human call - this test does not hard-fail the
 * build on a mismatch or a sub-80% metric, it only asserts the harness itself ran cleanly
 * (loaded all 20 entries, no exceptions) and prints the full report for that manual review.
 */
@SpringBootTest
@ActiveProfiles("test")
class SyntheticDatasetEvaluationTest {

    private static final String DATASET_PATH = "test-prompts.json";
    private static final Long TEST_USER_ID = 1L;
    private static final String TEST_ROLE = "USER";

    @Autowired private DetectionEngine detectionEngine;
    @Autowired private RiskAnalysisEngine riskAnalysisEngine;
    @Autowired private RiskSubScoreCalculator riskSubScoreCalculator;
    @Autowired private RiskScorer riskScorer;
    @Autowired private PolicyDecisionEngine policyDecisionEngine;

    private record TestPromptCase(String id, String text, String expectedDecision, List<String> expectedEntityTypes) {
    }

    @Test
    void evaluatesSyntheticDatasetAndReportsAccuracyMetrics() throws IOException {
        List<TestPromptCase> cases = loadDataset();
        assertEquals(20, cases.size());

        int passed = 0;
        int failed = 0;
        int truePositives = 0;
        int falsePositives = 0;
        int falseNegatives = 0;
        List<String> failureDetails = new ArrayList<>();

        for (TestPromptCase testCase : cases) {
            List<DetectionFinding> findings = detectionEngine.detectAll(testCase.text());
            List<RiskSignalResult> signals = riskAnalysisEngine.analyze(testCase.text(), TEST_USER_ID);
            RiskSubScores subScores =
                    riskSubScoreCalculator.compute(findings, signals, TEST_ROLE, testCase.text().length());
            double riskScore = riskScorer.score(subScores);
            DecisionResult decisionResult = policyDecisionEngine.decide(riskScore, findings, signals);

            Set<String> actualEntityTypes = findings.stream()
                    .map(f -> f.getEntityType().name())
                    .collect(Collectors.toCollection(HashSet::new));
            Set<String> expectedEntityTypes = new HashSet<>(testCase.expectedEntityTypes());
            String actualDecision = decisionResult.decision().name();

            boolean decisionMatches = actualDecision.equals(testCase.expectedDecision());
            boolean entitiesMatch = actualEntityTypes.equals(expectedEntityTypes);

            if (decisionMatches && entitiesMatch) {
                passed++;
            } else {
                failed++;
                failureDetails.add(String.format(
                        "  [%s] expectedDecision=%s actualDecision=%s expectedEntities=%s actualEntities=%s",
                        testCase.id(), testCase.expectedDecision(), actualDecision,
                        expectedEntityTypes, actualEntityTypes));
            }

            for (String type : actualEntityTypes) {
                if (expectedEntityTypes.contains(type)) {
                    truePositives++;
                } else {
                    falsePositives++;
                }
            }
            for (String type : expectedEntityTypes) {
                if (!actualEntityTypes.contains(type)) {
                    falseNegatives++;
                }
            }
        }

        double precision = (truePositives + falsePositives) == 0 ? 0.0
                : (double) truePositives / (truePositives + falsePositives);
        double recall = (truePositives + falseNegatives) == 0 ? 0.0
                : (double) truePositives / (truePositives + falseNegatives);
        double f1 = (precision + recall) == 0.0 ? 0.0 : 2 * precision * recall / (precision + recall);

        System.out.println("=== Phase 39.4: synthetic dataset evaluation report ===");
        System.out.println("Total tested: " + cases.size());
        System.out.println("Passed (decision + entities both match expected): " + passed);
        System.out.println("Failed: " + failed);
        if (!failureDetails.isEmpty()) {
            System.out.println("Failure details:");
            failureDetails.forEach(System.out::println);
        }
        System.out.println("Entity detection - TP: " + truePositives + ", FP: " + falsePositives
                + ", FN: " + falseNegatives);
        System.out.printf("Entity detection precision: %.2f%%%n", precision * 100);
        System.out.printf("Entity detection recall: %.2f%%%n", recall * 100);
        System.out.printf("Entity detection F1-score: %.2f%%%n", f1 * 100);

        assertFalse(cases.isEmpty());
    }

    private List<TestPromptCase> loadDataset() throws IOException {
        ObjectMapper mapper = new ObjectMapper();
        try (InputStream inputStream = new ClassPathResource(DATASET_PATH).getInputStream()) {
            return mapper.readValue(inputStream, mapper.getTypeFactory()
                    .constructCollectionType(List.class, TestPromptCase.class));
        }
    }
}
