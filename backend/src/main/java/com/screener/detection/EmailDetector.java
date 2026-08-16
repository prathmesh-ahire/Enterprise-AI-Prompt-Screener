package com.screener.detection;

import com.screener.model.EntityType;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Pass 1: loose email-shaped regex. Pass 2: validates the domain part label-by-label
 * (RFC-1035-style host label rules) and the TLD, rejecting matches with a malformed domain.
 */
@Component
public class EmailDetector implements Detector {

    private static final Pattern CANDIDATE_PATTERN =
            Pattern.compile("[A-Za-z0-9][A-Za-z0-9._%+-]*@[A-Za-z0-9.-]+\\.[A-Za-z]{2,24}");

    private static final Pattern LABEL_PATTERN =
            Pattern.compile("^[A-Za-z0-9]([A-Za-z0-9-]{0,61}[A-Za-z0-9])?$");

    private static final double CONFIDENCE = 0.9;

    @Override
    public EntityType getEntityType() {
        return EntityType.PERSONAL_EMAIL;
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
        String domain = candidate.value().substring(candidate.value().indexOf('@') + 1);
        String[] labels = domain.split("\\.");
        if (labels.length < 2) {
            return 0.0;
        }
        for (String label : labels) {
            if (!LABEL_PATTERN.matcher(label).matches()) {
                return 0.0;
            }
        }
        String tld = labels[labels.length - 1];
        if (!tld.chars().allMatch(Character::isLetter)) {
            return 0.0;
        }
        return CONFIDENCE;
    }
}
