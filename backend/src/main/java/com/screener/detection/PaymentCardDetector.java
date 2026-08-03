package com.screener.detection;

import com.screener.model.EntityType;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Pass 1: 13-19 digit runs, allowing single space/hyphen separators between digits
 * (common card-number formatting), isolated from any longer digit run. Pass 2: Luhn
 * checksum validation on the digits with separators stripped.
 */
@Component
public class PaymentCardDetector implements Detector {

    private static final Pattern CANDIDATE_PATTERN =
            Pattern.compile("(?<!\\d)\\d(?:[ -]?\\d){12,18}(?!\\d)");

    private static final double CONFIDENCE = 0.85;

    @Override
    public EntityType getEntityType() {
        return EntityType.PAYMENT_CARD;
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
        String digits = candidate.value().replaceAll("[ -]", "");
        if (digits.length() < 13 || digits.length() > 19) {
            return 0.0;
        }
        return isValidLuhn(digits) ? CONFIDENCE : 0.0;
    }

    private boolean isValidLuhn(String digits) {
        int sum = 0;
        boolean alternate = false;
        for (int i = digits.length() - 1; i >= 0; i--) {
            int n = Character.digit(digits.charAt(i), 10);
            if (alternate) {
                n *= 2;
                if (n > 9) {
                    n -= 9;
                }
            }
            sum += n;
            alternate = !alternate;
        }
        return sum % 10 == 0;
    }
}
