package com.screener.detection;

import com.screener.model.EntityType;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Pass 1: {@code password=}/{@code pwd=}/{@code passwd=} followed by a non-whitespace value.
 * Pass 2: rejects obvious placeholder values (bracketed template text, or the literal
 * word "password"/"changeme") so a doc/template mention doesn't get flagged as a real secret.
 */
@Component
public class PasswordDetector implements Detector {

    private static final Pattern CANDIDATE_PATTERN =
            Pattern.compile("(?i)\\b(?:password|pwd|passwd)\\b\\s*[:=]\\s*(\\S+)");

    private static final Pattern PLACEHOLDER_PATTERN = Pattern.compile("^[<\\[{].*[>\\]}]$");

    private static final Set<String> PLACEHOLDER_VALUES = Set.of("password", "changeme");

    private static final double CONFIDENCE = 0.75;

    @Override
    public EntityType getEntityType() {
        return EntityType.PASSWORD_SECRET;
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
        String value = candidate.value();
        if (PLACEHOLDER_PATTERN.matcher(value).matches()) {
            return 0.0;
        }
        if (PLACEHOLDER_VALUES.contains(value.toLowerCase())) {
            return 0.0;
        }
        return CONFIDENCE;
    }
}
