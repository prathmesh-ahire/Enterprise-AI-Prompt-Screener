package com.screener.evaluation;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.core.util.DefaultIndenter;
import com.fasterxml.jackson.core.util.DefaultPrettyPrinter;
import com.fasterxml.jackson.core.util.Separators;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.screener.detection.DecisionResult;
import com.screener.detection.DetectionEngine;
import com.screener.detection.PolicyDecisionEngine;
import com.screener.detection.RiskAnalysisEngine;
import com.screener.detection.RiskScorer;
import com.screener.detection.RiskSignalResult;
import com.screener.detection.RiskSubScoreCalculator;
import com.screener.detection.RiskSubScores;
import com.screener.detection.RiskThresholds;
import com.screener.model.DetectionFinding;
import com.screener.model.EntityType;
import com.screener.model.OverrideRule;
import com.screener.model.SignalType;
import com.screener.service.MaskingService;
import com.screener.service.PromptService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.core.io.ClassPathResource;
import org.springframework.test.context.ActiveProfiles;

import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assertions.fail;
import static org.junit.jupiter.api.Assumptions.assumeTrue;

/**
 * Runs every prompt in {@code test-prompts.json} through the real screening pipeline and
 * compares the outcome with {@code frontend/src/content/pipeline-snapshot.json}, the file the
 * public pages read their examples, formula weights, thresholds and placeholders from. A change
 * to detection, scoring or the decision rules therefore fails this test until the snapshot is
 * regenerated, so the site can never describe behaviour the backend no longer has.
 *
 * <p>Every prompt is screened as a USER with no history. Nothing is read from the database:
 * no detector is disabled, the thresholds and maximum length are the defaults, and the user id
 * has no audit events, so other tests' data cannot change the result.
 *
 * <p>To regenerate the file after an intended change, run
 * {@code ./mvnw test -Dtest=PipelineSnapshotTest -Dsnapshot.write=true} from {@code backend/}.
 * When the frontend folder is absent (the backend Docker build) the test is skipped.
 */
@SpringBootTest
@ActiveProfiles("test")
class PipelineSnapshotTest {

    private static final String DATASET_PATH = "test-prompts.json";
    private static final Path CONTENT_DIR = Path.of("..", "frontend", "src", "content");
    private static final Path SNAPSHOT_FILE = CONTENT_DIR.resolve("pipeline-snapshot.json");
    private static final String WRITE_PROPERTY = "snapshot.write";
    private static final String ROLE = "USER";
    // No audit event can exist for this id, so the repeated-attack signal never fires.
    private static final long USER_ID_WITH_NO_HISTORY = 987_654_321L;

    @Autowired private DetectionEngine detectionEngine;
    @Autowired private RiskAnalysisEngine riskAnalysisEngine;
    @Autowired private RiskSubScoreCalculator riskSubScoreCalculator;
    @Autowired private RiskScorer riskScorer;
    @Autowired private PolicyDecisionEngine policyDecisionEngine;
    @Autowired private MaskingService maskingService;

    @JsonIgnoreProperties(ignoreUnknown = true)
    private record TestPromptCase(String id, String text) {
    }

    @Test
    void pipelineOutputMatchesTheFrontendSnapshot() throws IOException {
        assumeTrue(Files.isDirectory(CONTENT_DIR),
                "frontend/src/content not found, so there is no snapshot to compare");

        ObjectMapper mapper = new ObjectMapper();
        JsonNode actual = mapper.valueToTree(buildSnapshot());

        if (Boolean.getBoolean(WRITE_PROPERTY)) {
            DefaultPrettyPrinter printer = new DefaultPrettyPrinter()
                    .withSeparators(Separators.createDefaultInstance()
                            .withObjectFieldValueSpacing(Separators.Spacing.AFTER)
                            .withObjectEmptySeparator("")
                            .withArrayEmptySeparator(""))
                    .withObjectIndenter(new DefaultIndenter("  ", "\n"))
                    .withArrayIndenter(new DefaultIndenter("  ", "\n"));
            Files.writeString(SNAPSHOT_FILE,
                    mapper.writer(printer).writeValueAsString(actual) + "\n", StandardCharsets.UTF_8);
            return;
        }

        assertTrue(Files.exists(SNAPSHOT_FILE),
                SNAPSHOT_FILE + " is missing. Generate it with -D" + WRITE_PROPERTY + "=true");
        JsonNode expected = mapper.readTree(Files.readString(SNAPSHOT_FILE, StandardCharsets.UTF_8));
        if (!expected.equals(actual)) {
            fail("pipeline-snapshot.json no longer matches the pipeline: " + describeDifference(expected, actual)
                    + ". If the change is intended, regenerate it with -D" + WRITE_PROPERTY + "=true");
        }
    }

    private Map<String, Object> buildSnapshot() throws IOException {
        Map<String, Object> snapshot = new LinkedHashMap<>();
        snapshot.put("formulaWeights", formulaWeights());
        snapshot.put("thresholds", thresholds());
        snapshot.put("placeholders", placeholders());
        snapshot.put("signalTypes", Arrays.stream(SignalType.values()).map(Enum::name).toList());
        snapshot.put("examples", examples());
        return snapshot;
    }

    private Map<String, Object> formulaWeights() {
        Map<String, Object> weights = new LinkedHashMap<>();
        weights.put("sensitiveData", RiskScorer.WEIGHT_SENSITIVE_DATA);
        weights.put("injection", RiskScorer.WEIGHT_INJECTION);
        weights.put("secretCriticality", RiskScorer.WEIGHT_SECRET_CRITICALITY);
        weights.put("policyContext", RiskScorer.WEIGHT_POLICY_CONTEXT);
        weights.put("obfuscation", RiskScorer.WEIGHT_OBFUSCATION);
        return weights;
    }

    private Map<String, Object> thresholds() {
        RiskThresholds defaults = RiskThresholds.defaults();
        Map<String, Object> thresholds = new LinkedHashMap<>();
        thresholds.put("mask", defaults.mask());
        thresholds.put("confirm", defaults.confirm());
        thresholds.put("review", defaults.review());
        thresholds.put("block", defaults.block());
        return thresholds;
    }

    // The placeholder map is private to MaskingService, so read it the way the pipeline does:
    // mask a one-character span of each entity type.
    private Map<String, Object> placeholders() {
        Map<String, Object> placeholders = new LinkedHashMap<>();
        for (EntityType type : EntityType.values()) {
            DetectionFinding finding = new DetectionFinding();
            finding.setEntityType(type);
            finding.setStartPos(0);
            finding.setEndPos(1);
            placeholders.put(type.name(), maskingService.getMaskedPreview("x", List.of(finding)));
        }
        return placeholders;
    }

    private List<Map<String, Object>> examples() throws IOException {
        List<Map<String, Object>> examples = new ArrayList<>();
        for (TestPromptCase testCase : loadDataset()) {
            String text = testCase.text();
            List<DetectionFinding> findings = detectionEngine.detectAll(text, Set.of());
            List<RiskSignalResult> signals = riskAnalysisEngine.analyze(text, USER_ID_WITH_NO_HISTORY);
            RiskSubScores subScores = riskSubScoreCalculator.compute(
                    findings, signals, ROLE, text.length(), PromptService.DEFAULT_MAX_LENGTH);
            double riskScore = riskScorer.score(subScores);
            DecisionResult result = policyDecisionEngine.decide(
                    riskScore, findings, signals, RiskThresholds.defaults());

            Map<String, Object> sub = new LinkedHashMap<>();
            sub.put("sensitiveData", subScores.sensitiveDataScore());
            sub.put("injection", subScores.injectionScore());
            sub.put("secretCriticality", subScores.secretCriticalityScore());
            sub.put("policyContext", subScores.policyContextScore());
            sub.put("obfuscation", subScores.obfuscationScore());

            Map<String, Object> example = new LinkedHashMap<>();
            example.put("id", testCase.id());
            example.put("text", text);
            example.put("decision", result.decision().name());
            example.put("scoreBand", result.scoreBand().name());
            example.put("appliedOverrides", result.appliedOverrides().stream().map(OverrideRule::name).toList());
            example.put("subScores", sub);
            example.put("riskScore", riskScore);
            example.put("entityTypes", findings.stream()
                    .map(f -> f.getEntityType().name()).distinct().sorted(Comparator.naturalOrder()).toList());
            example.put("maskedText", maskingService.getMaskedPreview(text, findings));
            examples.add(example);
        }
        return examples;
    }

    private List<TestPromptCase> loadDataset() throws IOException {
        ObjectMapper mapper = new ObjectMapper();
        try (InputStream in = new ClassPathResource(DATASET_PATH).getInputStream()) {
            return mapper.readValue(in, mapper.getTypeFactory().constructCollectionType(List.class, TestPromptCase.class));
        }
    }

    // Names the first section, and the first example, that differs, so a failure says where to look.
    private String describeDifference(JsonNode expected, JsonNode actual) {
        for (var it = actual.fieldNames(); it.hasNext(); ) {
            String section = it.next();
            if (section.equals("examples")) {
                continue;
            }
            if (!actual.get(section).equals(expected.get(section))) {
                return "differs in \"" + section + "\": expected " + expected.get(section)
                        + " but the pipeline now gives " + actual.get(section);
            }
        }
        JsonNode expectedExamples = expected.get("examples");
        JsonNode actualExamples = actual.get("examples");
        if (expectedExamples == null || expectedExamples.size() != actualExamples.size()) {
            return "the number of examples changed";
        }
        for (int i = 0; i < actualExamples.size(); i++) {
            if (!actualExamples.get(i).equals(expectedExamples.get(i))) {
                return "differs in example \"" + actualExamples.get(i).get("id").asText() + "\": expected "
                        + expectedExamples.get(i) + " but the pipeline now gives " + actualExamples.get(i);
            }
        }
        return "snapshots differ";
    }
}
