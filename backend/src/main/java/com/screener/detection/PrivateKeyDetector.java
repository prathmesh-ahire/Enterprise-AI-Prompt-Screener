package com.screener.detection;

import com.screener.model.EntityType;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Pass 1: a full {@code -----BEGIN X PRIVATE KEY-----...-----END X PRIVATE KEY-----} block
 * (backreference ties the footer's key-type label to the header's). Pass 2: the body
 * between header and footer must actually look like base64 key material — rejects a
 * template/placeholder mention where the header/footer are present but the body isn't.
 */
@Component
public class PrivateKeyDetector implements Detector {

    private static final Pattern CANDIDATE_PATTERN =
            Pattern.compile("-----BEGIN ([A-Z ]*PRIVATE KEY)-----([\\s\\S]*?)-----END \\1-----");

    private static final Pattern BASE64_PATTERN = Pattern.compile("^[A-Za-z0-9+/=]+$");

    private static final int MIN_BODY_LENGTH = 20;
    private static final double CONFIDENCE = 1.0;

    @Override
    public EntityType getEntityType() {
        return EntityType.PRIVATE_KEY;
    }

    @Override
    public List<Candidate> findCandidates(String text) {
        List<Candidate> candidates = new ArrayList<>();
        Matcher matcher = CANDIDATE_PATTERN.matcher(text);
        while (matcher.find()) {
            candidates.add(new Candidate(matcher.start(), matcher.end(), matcher.group(2)));
        }
        return candidates;
    }

    @Override
    public double validate(String text, Candidate candidate) {
        String body = candidate.value().replaceAll("\\s", "");
        if (body.length() < MIN_BODY_LENGTH || !BASE64_PATTERN.matcher(body).matches()) {
            return 0.0;
        }
        return CONFIDENCE;
    }
}
