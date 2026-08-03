package com.screener.detection;

import com.screener.model.EntityType;
import com.screener.model.OrgConfidentialTerm;
import com.screener.repository.OrgConfidentialTermRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Pass 1: case-insensitive word-boundary matching against the admin-maintained
 * {@code org_confidential_terms} dictionary (Phase 20.2/20.4 manage the table's contents).
 * Pass 2 is trivial here — matching the exact admin-curated term already IS the validation,
 * there's no further format check to run.
 */
@Component
@RequiredArgsConstructor
public class OrgConfidentialDetector implements Detector {

    private static final double CONFIDENCE = 0.95;

    private final OrgConfidentialTermRepository orgConfidentialTermRepository;

    @Override
    public EntityType getEntityType() {
        return EntityType.ORG_CONFIDENTIAL;
    }

    @Override
    public List<Candidate> findCandidates(String text) {
        List<Candidate> candidates = new ArrayList<>();
        for (OrgConfidentialTerm term : orgConfidentialTermRepository.findByActiveTrue()) {
            Pattern pattern = Pattern.compile("(?i)\\b" + Pattern.quote(term.getTerm()) + "\\b");
            Matcher matcher = pattern.matcher(text);
            while (matcher.find()) {
                candidates.add(new Candidate(matcher.start(), matcher.end(), matcher.group()));
            }
        }
        return candidates;
    }

    @Override
    public double validate(String text, Candidate candidate) {
        return CONFIDENCE;
    }
}
