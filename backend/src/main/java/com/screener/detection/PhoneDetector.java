package com.screener.detection;

import com.screener.model.EntityType;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Pass 1: loose Indian-mobile-shaped regex (10 digits, starts 6-9) — deliberately not
 * anchored to word boundaries so it can also match inside longer digit runs. Pass 2:
 * surrounding-context check rejects it if it's actually a substring of a longer
 * digit/letter run (e.g. part of a card number or an ID), keeping it to genuinely
 * isolated 10-digit tokens.
 */
@Component
public class PhoneDetector implements Detector {

    private static final Pattern CANDIDATE_PATTERN = Pattern.compile("[6-9]\\d{9}");

    private static final double CONFIDENCE = 0.85;

    @Override
    public EntityType getEntityType() {
        return EntityType.PHONE_NUMBER;
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
        if (isWordChar(text, candidate.start() - 1) || isWordChar(text, candidate.end())) {
            return 0.0;
        }
        return CONFIDENCE;
    }

    private boolean isWordChar(String text, int index) {
        if (index < 0 || index >= text.length()) {
            return false;
        }
        char c = text.charAt(index);
        return Character.isLetterOrDigit(c) || c == '_';
    }
}
