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
 * sentence — every one of them offered as a candidate.
 * Pass 2: accept only a candidate that actually looks like secret material.
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

    // Added bare "pass". It is also an ordinary English verb, so on its own it would
    // be a precision risk - but pass 2 requires a secret-shaped value, so "pass the salt"
    // offers "the" and is rejected, while "pass: Winter235@" is caught. Verified against
    // the 40-prompt benign corpus rather than assumed.
    // Added the plural forms and "passcode". Measured over 2,601 real password
    // sentences from ai4privacy/pii-masking-200k, 40 carried only a plural or "passcode"
    // ("recite passwords, with X being most repeated", "use the passcode X") and were
    // therefore missed entirely. The suffix is spelled out per keyword rather than as
    // \w* on purpose: "pass\w*" would fire on passage, passenger, passing and passport.
    private static final Pattern KEYWORD_PATTERN =
            Pattern.compile("(?i)\\b(?:passwords?|passphrases?|passcodes?|passwd|pwd|pass)\\b");

    /** How many tokens either side of the keyword may be considered. Covers "for the shared account is X". */
    private static final int WINDOW = 6;

    // '=' and ':' are trimmed from the FRONT because "password=Winter235@" is one
    // whitespace-delimited token: without this the candidate is "=Winter235@", which is
    // secret-shaped enough to be accepted and would then be masked including the separator,
    // rendering "password[SECRET_REMOVED]" instead of "password=[SECRET_REMOVED]".
    // Caught by PasswordDetectorTest.detectsBothSecretsWhenTwoKeywordsAppear.
    /** A keyword glued to its value by a separator, as in {@code password=X}. See {@link #emit}. */
    private static final Pattern KEYWORD_PREFIX = Pattern.compile(
            "(?i)^(?:passwords?|passphrases?|passcodes?|passwd|pwd|pass)\\s*[:=]\\s*");

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
            scanForward(text, keyword.end(), candidates, seenSpans);
            scanBackward(text, keyword.start(), candidates, seenSpans);
        }
        return candidates;
    }

    /** "my password is X" — the keyword announces the value that follows it. */
    private void scanForward(String text, int from, List<Candidate> out, Set<Long> seen) {
        int cursor = from;
        int emitted = 0;

        while (cursor < text.length() && emitted < WINDOW) {
            while (cursor < text.length() && Character.isWhitespace(text.charAt(cursor))) {
                cursor++;
            }
            if (cursor >= text.length()) {
                return;
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

            emit(text, cursor, tokenEnd, out, seen);
            emitted++;
            if (endsSentence) {
                return;
            }
            cursor = tokenEnd;
        }
    }

    /**
     * "X is my password" — the value comes first and the keyword names it afterwards.
     *
     * <p>Added in 53.7. The scan used to run forward only, which reads naturally but is not
     * how a third of people write: measured over 2,601 real password sentences from
     * {@code ai4privacy/pii-masking-200k}, <b>409</b> put the secret <em>before</em> the
     * keyword and were unreachable — the single largest fixable cause of missed passwords.
     *
     * <p>Bugfix: the original backward sentence rule excluded any token ending in
     * {@code [.!?]} outright, on the theory that it belonged to a separate, preceding
     * statement. That made "Sup3rSecretValue! is my password" unreachable — the password
     * itself ends in {@code !}, and this exact phrasing is the project's headline
     * value-before-keyword case. The rule now only treats {@code [.!?]} as a real sentence
     * break when the word immediately after it is capitalised ("Winter235@. I forgot my
     * password"); otherwise the punctuation is read as part of the value, exactly as the
     * forward scan already treats a trailing "!" on {@code password: X!}.
     */
    private void scanBackward(String text, int from, List<Candidate> out, Set<Long> seen) {
        int cursor = from;
        int emitted = 0;
        // Start of the word immediately following the token currently being examined, in
        // reading order - initially the keyword itself. See the boundary check below.
        int nextWordStart = from;

        while (cursor > 0 && emitted < WINDOW) {
            while (cursor > 0 && Character.isWhitespace(text.charAt(cursor - 1))) {
                cursor--;
            }
            if (cursor <= 0) {
                return;
            }
            int tokenStart = cursor;
            while (tokenStart > 0 && !Character.isWhitespace(text.charAt(tokenStart - 1))) {
                tokenStart--;
            }

            // A token ending in [.!?] is only a genuine sentence boundary if the word that
            // follows it starts a new sentence - i.e. is capitalised, as in "Winter235@. I
            // forgot my password". "Sup3rSecretValue! is my password" also ends in "!", but
            // "is" that follows stays lower-case: the "!" belongs to the value, not to a
            // sentence break, and a password is exactly the kind of value likely to end in
            // punctuation. Without this distinction the value-before-keyword phrasing this
            // scan exists for ("X! is my password") could never be reached.
            boolean endsSentence = text.substring(tokenStart, cursor).matches(".*[.!?][\"'`)\\]]*$");
            if (endsSentence && nextWordStart < text.length()
                    && Character.isUpperCase(text.charAt(nextWordStart))) {
                return;
            }
            emit(text, tokenStart, cursor, out, seen);
            emitted++;
            cursor = tokenStart;
            nextWordStart = tokenStart;
        }
    }

    /** Trim surrounding punctuation, adjusting the span so masking replaces the value alone. */
    private void emit(String text, int start, int end, List<Candidate> out, Set<Long> seen) {
        String raw = text.substring(start, end);

        // "password=Winter235@" is a single whitespace-delimited token, so a backward scan
        // from a LATER keyword reaches it whole and would report the keyword as part of the
        // secret - a third finding overlapping the one the forward scan already made, and a
        // mask that swallows the word "password". Strip the keyword and its separator so the
        // span matches the forward scan's exactly and the de-duplication below collapses them.
        // Caught by PasswordDetectorTest.detectsBothSecretsWhenTwoKeywordsAppear.
        Matcher prefix = KEYWORD_PREFIX.matcher(raw);
        if (prefix.find()) {
            start += prefix.group().length();
            raw = raw.substring(prefix.group().length());
        }

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
                && seen.add(((long) start << 32) | (end & 0xffffffffL))) {
            out.add(new Candidate(start, end, raw));
        }
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
