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

    // Was "[6-9]\d{9}" - ten CONTIGUOUS digits and nothing else, so the
    // audit found it missed "+91 98765 43210", "+919876543210", "98765-43210" and
    // "98765 43210", i.e. most of the ways an Indian mobile number is actually written.
    //
    // Now: an optional +91 / 91 / 0 prefix, then the ten digits with optional single
    // spaces or hyphens between groups. The prefix and separators are OPTIONAL and the
    // group is captured whole, so the reported offsets cover the number exactly as
    // written - masking replaces by position, so a partial span would leave digits behind.
    // The leading (?<!\d) is load-bearing, not decoration. Without it, "091-9876543210"
    // let the "91" of the prefix match the "91" inside "091", so the match STARTED at
    // index 1 - immediately after a digit - and pass 2 correctly rejected it as part of a
    // longer run. The lookbehind stops a match beginning mid-digit-run, so the engine
    // moves on and finds the real number after the hyphen.
    //
    // Three body shapes: 3-3-4 grouping, 5-5 grouping, and ten contiguous digits.
    private static final Pattern CANDIDATE_PATTERN = Pattern.compile(
            "(?<!\\d)(?:\\+?91[\\s-]?|0)?[6-9](?:\\d{2}[\\s-]?\\d{3}[\\s-]?\\d{4}|\\d{4}[\\s-]?\\d{5}|\\d{9})");

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
