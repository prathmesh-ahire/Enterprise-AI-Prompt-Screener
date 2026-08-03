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

    private static final Pattern CANDIDATE_PATTERN = Pattern.compile(
            "(?i)\\b(?:api[_-]?key|apikey|bearer|token)\\b\\s*[:=]?\\s*([A-Za-z0-9_\\-.]{20,})");

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
