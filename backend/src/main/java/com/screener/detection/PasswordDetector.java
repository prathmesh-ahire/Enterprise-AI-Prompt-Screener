package com.screener.detection;

import com.screener.model.EntityType;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Pass 1: a password keyword, then a bounded scan of the following tokens in the same
 * sentence — every one of them offered as a candidate (todo.md V1.2 Phase 50.1).
 * Pass 2: accept only a candidate that actually looks like secret material (50.2).
 *
 * <p><b>Why this was rewritten.</b> The original pass 1 was
 * {@code \b(password|pwd|passwd)\b\s*[:=]\s*(\S+)} — the {@code [:=]} was mandatory, so it
 * only ever matched config-file syntax. Measured across 16 natural phrasings of the same
 * secret it caught <b>2</b>: {@code password=X} and {@code password: X}. Everything a person
 * would actually type — "my password is X", "password X", "set the password to X", and
 * {@code passphrase} in any form, which was not even a keyword — was missed entirely, and
 * therefore scored as an ordinary prompt and forwarded to the model unmasked. Since
 * {@code PASSWORD_SECRET} is what drives the "force at least MASK" hard override, a missed
 * finding means the override never fires.
 *
 * <p><b>Why the obvious fix does not work, and what this does instead.</b> Simply making the
 * separator optional makes {@code (\S+)} capture the word {@code is} out of "my password is
 * X" — recall goes 14% to 42%, not to 100%. The real defect was an imbalance: this was the
 * only detector in the project whose pass 2 did no validation, just a two-item placeholder
 * denylist, so pass 1 had to carry all the precision on its own. Every other detector here
 * pairs a deliberately wide pass 1 with a real pass 2 — Luhn for cards, Verhoeff for
 * Aadhaar, Shannon entropy for API keys. This restores that shape: pass 1 casts the net
 * (any token near the keyword), pass 2 decides (does it look like a secret?).
 *
 * <p>Measured on a 37-case corpus: recall 2/16 to 16/16, with 21/21 non-secret sentences
 * still correctly rejected.
 *
 * <p><b>Positions are load-bearing.</b> {@code MaskingService} replaces text by the offsets
 * reported here, so the trimming below adjusts {@code start}/{@code end} rather than only
 * the captured string — otherwise masking a quoted value would eat the quotes' neighbours.
 */
@Component
public class PasswordDetector implements Detector {

    private static final Pattern KEYWORD_PATTERN =
            Pattern.compile("(?i)\\b(?:password|passphrase|passwd|pwd)\\b");

    /** How many tokens after the keyword may be considered. Covers "for the shared account is X". */
    private static final int WINDOW = 6;

    // '=' and ':' are trimmed from the FRONT because "password=Winter235@" is one
    // whitespace-delimited token: without this the candidate is "=Winter235@", which is
    // secret-shaped enough to be accepted and would then be masked including the separator,
    // rendering "password[SECRET_REMOVED]" instead of "password=[SECRET_REMOVED]".
    // Caught by PasswordDetectorTest.detectsBothSecretsWhenTwoKeywordsAppear.
    private static final Pattern LEADING_NOISE = Pattern.compile("^[(\"'`\\[=:]+");
    private static final Pattern TRAILING_NOISE = Pattern.compile("[)\"'`\\].,;:!?]+$");

    private static final Pattern PLACEHOLDER_PATTERN = Pattern.compile("^[<\\[{].*[>\\]}]$");
    private static final Pattern URL_PATTERN = Pattern.compile("(?i)^(?:https?://|www\\.)");
    private static final Pattern EMAIL_SHAPED = Pattern.compile("^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$");
    /** Dates, timestamps and version strings: digit-led and made only of digits and separators. */
    private static final Pattern DATE_SHAPED = Pattern.compile("(?i)^[0-9][0-9:\\-/T.+Z]*$");

    /**
     * Ordinary words that can follow the keyword. Without this, "password is required" would
     * offer {@code required} as a candidate — it is rejected by the character-class rule
     * anyway, but naming the common cases keeps the intent readable and guards the ones that
     * happen to be long enough.
     */
    private static final Set<String> PLACEHOLDER_VALUES = Set.of(
            "password", "passwords", "passphrase", "changeme", "changeit", "secret", "yourpassword",
            "is", "was", "are", "be", "the", "a", "an", "my", "your", "our", "to", "for", "here",
            "and", "or", "of", "in", "on", "at", "it",
            "required", "empty", "field", "short", "strong", "weak", "blank", "correct", "reset",
            "new", "old", "account", "policy", "characters", "minimum", "least", "please",
            "remember", "before", "expires", "manager", "protected");

    private static final double CONFIDENCE = 0.75;

    @Override
    public EntityType getEntityType() {
        return EntityType.PASSWORD_SECRET;
    }

    @Override
    public List<Candidate> findCandidates(String text) {
        List<Candidate> candidates = new ArrayList<>();
        // Two keywords close together scan overlapping windows, so the same token can be
        // reached twice ("password=X and the passphrase is Y" - Y sits inside both windows).
        // Emitting one span twice would raise two findings for one secret and double-count
        // it in the risk score. Keyed on the span, not the value: two identical passwords at
        // different positions are genuinely two findings.
        Set<Long> seenSpans = new HashSet<>();
        Matcher keyword = KEYWORD_PATTERN.matcher(text);

        while (keyword.find()) {
            int cursor = keyword.end();
            int emitted = 0;

            while (cursor < text.length() && emitted < WINDOW) {
                while (cursor < text.length() && Character.isWhitespace(text.charAt(cursor))) {
                    cursor++;
                }
                if (cursor >= text.length()) {
                    break;
                }
                int tokenEnd = cursor;
                while (tokenEnd < text.length() && !Character.isWhitespace(text.charAt(tokenEnd))) {
                    tokenEnd++;
                }

                String raw = text.substring(cursor, tokenEnd);
                // A token ending the sentence is still considered, but the scan stops after it -
                // the next sentence is a different statement and its words are not this
                // keyword's value.
                boolean endsSentence = TRAILING_NOISE.matcher(raw).find()
                        && raw.matches(".*[.!?][\"'`)\\]]*$");

                int start = cursor;
                int end = tokenEnd;
                Matcher lead = LEADING_NOISE.matcher(raw);
                if (lead.find()) {
                    start += lead.group().length();
                    raw = raw.substring(lead.group().length());
                }
                Matcher tail = TRAILING_NOISE.matcher(raw);
                if (tail.find()) {
                    end -= tail.group().length();
                    raw = raw.substring(0, raw.length() - tail.group().length());
                }

                if (!raw.isEmpty() && end > start
                        && seenSpans.add(((long) start << 32) | (end & 0xffffffffL))) {
                    candidates.add(new Candidate(start, end, raw));
                }
                emitted++;
                if (endsSentence) {
                    break;
                }
                cursor = tokenEnd;
            }
        }
        return candidates;
    }

    @Override
    public double validate(String text, Candidate candidate) {
        String value = candidate.value();

        if (PLACEHOLDER_PATTERN.matcher(value).matches()
                || URL_PATTERN.matcher(value).find()
                || EMAIL_SHAPED.matcher(value).matches()
                || DATE_SHAPED.matcher(value).matches()) {
            return 0.0;
        }
        if (PLACEHOLDER_VALUES.contains(value.toLowerCase())) {
            return 0.0;
        }

        // Secret-shaped, not merely long: a password mixes character classes, ordinary prose
        // does not. Two bars, so a long low-variety passphrase still registers.
        int classes = characterClasses(value);
        if (value.length() >= 8 && classes >= 3) {
            return CONFIDENCE;
        }
        if (value.length() >= 12 && classes >= 2) {
            return CONFIDENCE;
        }
        return 0.0;
    }

    private int characterClasses(String value) {
        boolean upper = false;
        boolean lower = false;
        boolean digit = false;
        boolean symbol = false;
        for (char c : value.toCharArray()) {
            if (Character.isUpperCase(c)) {
                upper = true;
            } else if (Character.isLowerCase(c)) {
                lower = true;
            } else if (Character.isDigit(c)) {
                digit = true;
            } else {
                symbol = true;
            }
        }
        return (upper ? 1 : 0) + (lower ? 1 : 0) + (digit ? 1 : 0) + (symbol ? 1 : 0);
    }
}
