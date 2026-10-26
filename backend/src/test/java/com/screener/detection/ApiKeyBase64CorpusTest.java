package com.screener.detection;

import com.screener.model.DetectionFinding;
import org.junit.jupiter.api.Test;

import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Precision and recall for the widening that let {@code ApiKeyDetector} see base64
 * key material containing {@code '/'} or {@code '+'}.
 *
 * <p>Both corpora are committed rather than deleted after use. The 12,000-row benign corpus
 * that validated earlier detector changes was thrown away once that audit finished, which
 * later left no safe way to confirm a PhoneDetector widening - that widening had to be
 * abandoned for lack of evidence. This test exists so the same thing does not happen to the
 * next person who wants to touch this charset.
 */
class ApiKeyBase64CorpusTest {

    private final ApiKeyDetector detector = new ApiKeyDetector();

    private List<String> load(String resource) throws Exception {
        List<String> lines = new ArrayList<>();
        try (InputStream in = getClass().getClassLoader().getResourceAsStream(resource)) {
            assertTrue(in != null, "missing test resource: " + resource);
            BufferedReader reader = new BufferedReader(new InputStreamReader(in, StandardCharsets.UTF_8));
            String line;
            while ((line = reader.readLine()) != null) {
                if (!line.isBlank() && !line.startsWith("#")) {
                    lines.add(line);
                }
            }
        }
        return lines;
    }

    /**
     * The precision bar, and the whole reason {@code '/'} was not simply added to the
     * existing charset. Every line pairs a detector keyword with a slash-bearing token, so
     * each one is a chance to fire wrongly. Zero tolerance: a false-positive API key forces
     * BLOCK, which would stop someone sharing an ordinary URL with the model.
     */
    @Test
    void raisesNoApiKeyFindingAnywhereInTheBenignCorpus() throws Exception {
        List<String> corpus = load("benign-slash-corpus.txt");
        assertTrue(corpus.size() >= 150, "corpus looks truncated: " + corpus.size());

        List<String> falsePositives = new ArrayList<>();
        for (String line : corpus) {
            if (!detector.detect(line).isEmpty()) {
                falsePositives.add(line);
            }
        }
        assertEquals(List.of(), falsePositives,
                falsePositives.size() + " false positive(s) of " + corpus.size());
    }

    /**
     * The recall side. Composition is not forced when the corpus is generated, so a handful
     * of randomly drawn keys legitimately carry no digit or only one case and are expected
     * to be missed; the bar is set below 100% to record that honestly rather than to hide
     * it. Before this change the figure was 0% - the charset could not express these at all.
     */
    @Test
    void detectsTheOverwhelmingMajorityOfBase64SecretCorpus() throws Exception {
        List<String> corpus = load("base64-secret-corpus.txt");
        assertTrue(corpus.size() >= 100, "corpus looks truncated: " + corpus.size());

        int detected = 0;
        for (String line : corpus) {
            List<DetectionFinding> findings = detector.detect(line);
            if (!findings.isEmpty()) {
                detected++;
            }
        }
        double recall = (double) detected / corpus.size();
        System.out.printf("=== post-54 base64 widening: recall %d/%d = %.1f%% ===%n",
                detected, corpus.size(), recall * 100);
        assertTrue(recall >= 0.95,
                "recall dropped to " + String.format("%.1f%%", recall * 100)
                        + " (" + detected + "/" + corpus.size() + ")");
    }
}
