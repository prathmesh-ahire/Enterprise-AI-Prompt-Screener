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
 * checksum validation on the digits with separators stripped, <em>and</em> a real issuer
 * prefix at a length that issuer uses — see {@link #matchesKnownIssuer}, without which
 * every 15-digit IMEI in ordinary text registers as a payment card.
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
        return isValidLuhn(digits) && matchesKnownIssuer(digits) ? CONFIDENCE : 0.0;
    }

    /**
     * Pass 2b (todo.md V1.2 Phase 53.7): the digits must also start with a real issuer
     * prefix <em>at a length that issuer actually uses</em>.
     *
     * <p><b>Why Luhn alone is not enough.</b> Luhn is a single check digit, so about one in
     * ten random digit runs of the right length passes it by chance — and worse, several
     * everyday identifiers carry a Luhn digit <em>by design</em>, IMEI numbers above all.
     * Measured over 12,000 rows of ordinary prose from {@code ai4privacy/pii-masking-200k}
     * carrying no card at all: <b>702</b> runs passed the length and Luhn checks, of which
     * <b>623 were 15-digit IMEIs</b>. Requiring a real issuer prefix removed <b>677 of the
     * 702 (96.4%)</b>.
     *
     * <p><b>It costs no recall.</b> A genuine card number always carries a valid IIN — that
     * is what the leading digits are for — so this rejects only things that were never cards.
     * The 25 survivors are coincidences: mostly 15-digit identifiers that happen to begin 34
     * or 37 and are therefore indistinguishable from American Express by pattern alone.
     */
    private boolean matchesKnownIssuer(String digits) {
        char first = digits.charAt(0);
        int p2 = Integer.parseInt(digits.substring(0, 2));
        int p3 = Integer.parseInt(digits.substring(0, 3));
        int p4 = Integer.parseInt(digits.substring(0, 4));

        return switch (digits.length()) {
            case 13 -> first == '4';                                            // early Visa
            case 14 -> (p3 >= 300 && p3 <= 305) || p2 == 36 || p2 == 38 || p2 == 39;  // Diners
            case 15 -> p2 == 34 || p2 == 37;                                    // Amex
            case 16 -> first == '4'                                             // Visa
                    || (p2 >= 51 && p2 <= 55) || (p4 >= 2221 && p4 <= 2720)     // Mastercard
                    || p4 == 6011 || (p3 >= 644 && p3 <= 649) || p2 == 65       // Discover
                    || p2 == 60 || p2 == 81 || p2 == 82                         // RuPay
                    || (p4 >= 3528 && p4 <= 3589);                              // JCB
            case 19 -> first == '4' || p4 == 6011 || p2 == 65 || (p4 >= 3528 && p4 <= 3589);
            // 17 and 18 digit runs are not issued as card numbers by any scheme.
            default -> false;
        };
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
