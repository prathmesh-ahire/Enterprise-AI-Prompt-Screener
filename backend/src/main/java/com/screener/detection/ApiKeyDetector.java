package com.screener.detection;

import com.screener.model.EntityType;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Pass 1: an api-key/token/bearer keyword followed by a 20+ char candidate token.
 * Pass 2: Shannon entropy of the token — rejects low-entropy look-alikes (repeated
 * characters, plain digit runs) that happen to be long enough but aren't actually
 * high-entropy secret material.
 */
@Component
public class ApiKeyDetector implements Detector {

    // Leading boundary is a negative lookbehind (not \b) so a keyword still counts when
    // it's glued to a prefix by an underscore (e.g. "test_api_key=...", a common env-var
    // naming style) - \b alone treats '_' as a word character, so "test_api_key" would
    // never be seen as starting a new word and the whole match would silently fail.
    // Minimum candidate length lowered from 20 to 16: 20 excluded real-shaped short keys
    // (e.g. "sk-12345abcdefghijk", 19 chars) that still clear the entropy check below.
    //
    // V1.2 Phase 50.3 widened pass 1 in three ways, all of them plain misses before:
    //   * "[\s_-]?" instead of "[_-]?" - "api key" written as TWO WORDS matched nothing at
    //     all, which is how a person writes it in a sentence.
    //   * "secret key" and "access key" added as keywords.
    //   * an optional "is"/"was" between keyword and value, so "my api key is <key>" works.
    //     Without it the value had to sit immediately after the keyword or a separator.
    // Widening is safe HERE specifically because pass 2 is strong: 16+ characters from a
    // restricted charset AND Shannon entropy >= 3.5. Neither bar moved. (Contrast
    // PasswordDetector, whose pass 2 was the weak link and had to be rebuilt first.)
    // "private key" is deliberately NOT a keyword - PrivateKeyDetector owns that entity
    // type, and adding it here would raise a second, competing finding for one secret.
    private static final Pattern CANDIDATE_PATTERN = Pattern.compile(
            "(?i)(?<![A-Za-z0-9])(?:(?:api|secret|access)[\\s_-]?key|apikey|bearer|token)\\b"
                    + "\\s*[:=]?\\s*(?:(?:is|was)\\s+)?([A-Za-z0-9_\\-.]{16,})");

    private static final double ENTROPY_THRESHOLD = 3.5;
    private static final double CONFIDENCE = 0.8;

    @Override
    public EntityType getEntityType() {
        return EntityType.API_KEY;
    }

    @Override
    public List<Candidate> findCandidates(String text) {
        List<Candidate> candidates = new ArrayList<>();
        Matcher matcher = CANDIDATE_PATTERN.matcher(text);
        while (matcher.find()) {
            candidates.add(new Candidate(matcher.start(1), matcher.end(1), matcher.group(1)));
        }
        return candidates;
    }

    @Override
    public double validate(String text, Candidate candidate) {
        return shannonEntropy(candidate.value()) >= ENTROPY_THRESHOLD ? CONFIDENCE : 0.0;
    }

    private double shannonEntropy(String value) {
        Map<Character, Integer> frequencies = new HashMap<>();
        for (char c : value.toCharArray()) {
            frequencies.merge(c, 1, Integer::sum);
        }
        double entropy = 0.0;
        int length = value.length();
        for (int count : frequencies.values()) {
            double probability = (double) count / length;
            entropy -= probability * (Math.log(probability) / Math.log(2));
        }
        return entropy;
    }
}
