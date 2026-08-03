package com.screener.detection;

import com.screener.model.EntityType;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Pass 1: 12-digit candidate (with optional single-space grouping, e.g. "1234 5678 9012"),
 * first digit restricted to 2-9 since real Aadhaar numbers never start with 0 or 1.
 * Pass 2: Verhoeff checksum validation (the actual algorithm UIDAI uses for Aadhaar's
 * check digit) — this is the "optional checksum-style validation" called for in todo.md 8.5.
 */
@Component
public class AadhaarDetector implements Detector {

    private static final Pattern CANDIDATE_PATTERN =
            Pattern.compile("(?<!\\d)[2-9]\\d{3}\\s?\\d{4}\\s?\\d{4}(?!\\d)");

    private static final double CONFIDENCE = 0.9;

    // Verhoeff algorithm multiplication (d), permutation (p) and inverse tables.
    private static final int[][] D = {
            {0, 1, 2, 3, 4, 5, 6, 7, 8, 9},
            {1, 2, 3, 4, 0, 6, 7, 8, 9, 5},
            {2, 3, 4, 0, 1, 7, 8, 9, 5, 6},
            {3, 4, 0, 1, 2, 8, 9, 5, 6, 7},
            {4, 0, 1, 2, 3, 9, 5, 6, 7, 8},
            {5, 9, 8, 7, 6, 0, 4, 3, 2, 1},
            {6, 5, 9, 8, 7, 1, 0, 4, 3, 2},
            {7, 6, 5, 9, 8, 2, 1, 0, 4, 3},
            {8, 7, 6, 5, 9, 3, 2, 1, 0, 4},
            {9, 8, 7, 6, 5, 4, 3, 2, 1, 0}
    };

    private static final int[][] P = {
            {0, 1, 2, 3, 4, 5, 6, 7, 8, 9},
            {1, 5, 7, 6, 2, 8, 3, 0, 9, 4},
            {5, 8, 0, 3, 7, 9, 6, 1, 4, 2},
            {8, 9, 1, 6, 0, 4, 3, 5, 2, 7},
            {9, 4, 5, 3, 1, 2, 6, 8, 7, 0},
            {4, 2, 8, 6, 5, 7, 3, 9, 0, 1},
            {2, 7, 9, 3, 8, 0, 6, 4, 1, 5},
            {7, 0, 4, 6, 9, 1, 3, 2, 5, 8}
    };

    @Override
    public EntityType getEntityType() {
        return EntityType.AADHAAR_LIKE_ID;
    }

    @Override
    public List<Candidate> findCandidates(String text) {
        List<Candidate> candidates = new ArrayList<>();
        Matcher matcher = CANDIDATE_PATTERN.matcher(text);
        while (matcher.find()) {
            candidates.add(new Candidate(matcher.start(), matcher.end(), matcher.group()));
        }
        return candidates;
    }

    @Override
    public double validate(String text, Candidate candidate) {
        String digits = candidate.value().replace(" ", "");
        if (digits.length() != 12) {
            return 0.0;
        }
        return isValidVerhoeff(digits) ? CONFIDENCE : 0.0;
    }

    private boolean isValidVerhoeff(String digits) {
        int c = 0;
        int length = digits.length();
        for (int i = 0; i < length; i++) {
            int digit = Character.digit(digits.charAt(length - 1 - i), 10);
            c = D[c][P[i % 8][digit]];
        }
        return c == 0;
    }
}
