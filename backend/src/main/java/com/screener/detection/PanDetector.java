package com.screener.detection;

import com.screener.model.EntityType;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Pass 1: PAN format ([A-Z]{5}[0-9]{4}[A-Z]). Pass 2: checks the 4th character is one
 * of the real PAN holder-type codes — this is a format check only, deliberately no real
 * identity/checksum validation (per todo.md 8.4 — PAN has no public checksum algorithm).
 */
@Component
public class PanDetector implements Detector {

    private static final Pattern CANDIDATE_PATTERN = Pattern.compile("\\b[A-Z]{5}[0-9]{4}[A-Z]\\b");

    // P=Individual, C=Company, H=HUF, A=AOP, T=Trust, B=BOI, L=Local Authority,
    // J=Artificial Judicial Person, G=Government, F=Firm
    private static final Set<Character> VALID_HOLDER_CODES =
            Set.of('P', 'C', 'H', 'A', 'T', 'B', 'L', 'J', 'G', 'F');

    private static final double CONFIDENCE = 0.75;

    @Override
    public EntityType getEntityType() {
        return EntityType.PAN_LIKE_ID;
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
        char holderCode = candidate.value().charAt(3);
        return VALID_HOLDER_CODES.contains(holderCode) ? CONFIDENCE : 0.0;
    }
}
