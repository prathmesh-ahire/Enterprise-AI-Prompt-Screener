package com.screener.detection;

import com.screener.model.EntityType;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Pass 1: an api-key/token/bearer keyword followed by a 20+ char candidate token.
 * Pass 2: Shannon entropy of the token — rejects low-entropy look-alikes (repeated
 * characters, plain digit runs) that happen to be long enough but aren't actually
 * high-entropy secret material.
 */
@Component
public class ApiKeyDetector implements Detector {

    // Leading boundary is a negative lookbehind (not \b) so a keyword still counts when
    // it's glued to a prefix by an underscore (e.g. "test_api_key=...", a common env-var
    // naming style) - \b alone treats '_' as a word character, so "test_api_key" would
    // never be seen as starting a new word and the whole match would silently fail.
    // Minimum candidate length lowered from 20 to 16: 20 excluded real-shaped short keys
    // (e.g. "sk-12345abcdefghijk", 19 chars) that still clear the entropy check below.
    //
    // Widened pass 1 in three ways, all of them plain misses before:
    //   * "[\s_-]?" instead of "[_-]?" - "api key" written as TWO WORDS matched nothing at
    //     all, which is how a person writes it in a sentence.
    //   * "secret key" and "access key" added as keywords.
    //   * an optional "is"/"was" between keyword and value, so "my api key is <key>" works.
    //     Without it the value had to sit immediately after the keyword or a separator.
    // Widening is safe HERE specifically because pass 2 is strong: 16+ characters from a
    // restricted charset AND Shannon entropy >= 3.5. Neither bar moved. (Contrast
    // PasswordDetector, whose pass 2 was the weak link and had to be rebuilt first.)
    // "private key" is deliberately NOT a keyword - PrivateKeyDetector owns that entity
    // type, and adding it here would raise a second, competing finding for one secret.
    // Replaced the adjacency rule with a proximity window, for the same
    // reason PasswordDetector was rebuilt. The old pattern allowed an optional
    // separator and an optional "is"/"was", then demanded the value IMMEDIATELY - so
    // "the API key is set to <key>" failed on the two extra words, and a value stated
    // before its keyword ("expects <key> in its credential slot") was unreachable in
    // principle. Measured over 198 generated API-key sentences: recall 58%, and every one
    // of the 83 misses was this defect.
    //
    // Widening pass 1 this far is safe HERE specifically because pass 2 is strong and
    // unchanged: the token must be 16+ characters drawn only from [A-Za-z0-9_-.] AND clear
    // Shannon entropy 3.5. That is what lets the net be cast this wide - the same argument
    // that rebuild made, and the reason PasswordDetector's pass 2 had to be fixed first.
    private static final Pattern KEYWORD_PATTERN = Pattern.compile(
            "(?i)(?<![A-Za-z0-9])(?:"
                    + "(?:api|secret|access|auth)[\\s_-]?keys?"
                    + "|apikeys?"
                    + "|client[\\s_-]?secrets?"
                    + "|credentials?"
                    + "|authentication"
                    + "|bearer"
                    + "|tokens?"
                    + "|secrets?"
                    + ")\\b");

    /** How many tokens either side of the keyword may be considered. */
    private static final int WINDOW = 6;

    /** The whole trimmed token must look like key material — no slashes, colons or spaces. */
    private static final Pattern KEY_SHAPED = Pattern.compile("[A-Za-z0-9_\\-.]{16,}");
    // Post-54 bugfix. KEY_SHAPED's charset has no '/' or '+', so base64 key material was
    // unreachable whenever those characters fell inside it - and they are two of the 64
    // base64 characters. The headline miss was an AWS secret access key: 40 base64
    // characters, which "aws_secret_access_key = wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
    // split into 13/7/18-character fragments, none of which reached the 16-character bar,
    // so the prompt screened ALLOW with no findings at all and the secret was forwarded.
    //
    // Simply adding '/' and '+' to KEY_SHAPED was NOT safe: it would also admit URLs and
    // file paths, and those clear the entropy bar comfortably (measured: an API doc URL
    // 4.11 bits/char, a log path 3.87, against 4.66 for the AWS key above and a 3.5
    // threshold), so "the auth token endpoint is api.example.com/v1/users/profile" would
    // have become a false-positive BLOCK. Entropy cannot separate these; character-class
    // composition can. Hence a SEPARATE shape with its own extra bars, applied only to
    // tokens that actually carry a '/' or '+' - every token without one still goes through
    // KEY_SHAPED on exactly the path it did before, so no existing behaviour moves.
    private static final Pattern BASE64_SHAPED = Pattern.compile("[A-Za-z0-9_.+/-]{20,}={0,2}");

    /** Most '/' characters a base64 candidate may carry before it reads as a path. */
    private static final int MAX_BASE64_SLASHES = 3;
    private static final Pattern LEADING_NOISE = Pattern.compile("^[(\"'`\\[=:]+");
    private static final Pattern TRAILING_NOISE = Pattern.compile("[)\"'`\\].,;:!?]+$");

    // A pasted key very often arrives with NO keyword near it at all -
    // somebody copies it straight out of a config file or a provider's dashboard. These are
    // the well-known issuer prefixes, which are themselves strong evidence: nothing else
    // looks like "sk-" or "ghp_" followed by twenty-odd high-entropy characters.
    // The same entropy bar in pass 2 still applies, so "sk-aaaaaaaaaaaaaaaa" is rejected.
    // AKIA is matched case-sensitively because AWS access key IDs are always upper-case and
    // a case-insensitive match would fire on ordinary words containing "akia".
    private static final Pattern BARE_PREFIX_PATTERN = Pattern.compile(
            "(?<![A-Za-z0-9])(?:(?i:sk|pk|rk)-[A-Za-z0-9_\\-.]{16,}"
                    + "|(?i:gh[pousr]_)[A-Za-z0-9_]{16,}"
                    + "|AKIA[A-Z0-9]{12,}"
                    + "|(?i:xox[baprs]-)[A-Za-z0-9-]{16,})");

    private static final double ENTROPY_THRESHOLD = 3.5;
    private static final double CONFIDENCE = 0.8;

    @Override
    public EntityType getEntityType() {
        return EntityType.API_KEY;
    }

    @Override
    public List<Candidate> findCandidates(String text) {
        List<Candidate> candidates = new ArrayList<>();
        // De-duplicated by span: a labelled key with a known prefix ("api_key=sk-...")
        // matches both patterns, and emitting it twice would raise two findings for one
        // secret and double-count it in the risk score.
        Set<Long> seenSpans = new HashSet<>();

        Matcher keyword = KEYWORD_PATTERN.matcher(text);
        while (keyword.find()) {
            scan(text, keyword.end(), true, candidates, seenSpans);
            scan(text, keyword.start(), false, candidates, seenSpans);
        }
        Matcher bare = BARE_PREFIX_PATTERN.matcher(text);
        while (bare.find()) {
            addCandidate(candidates, seenSpans, bare.start(), bare.end(), bare.group());
        }
        return candidates;
    }

    /**
     * Walk up to {@link #WINDOW} whitespace-delimited tokens away from the keyword, in one
     * direction, offering any key-shaped token as a candidate.
     *
     * <p>The sentence rule mirrors {@code PasswordDetector}: going forward, a token that
     * ends a sentence is still part of the current statement, so it is considered and the
     * scan then stops; going backward, such a token belongs to the previous statement, so
     * the scan stops without considering it.
     */
    private void scan(String text, int from, boolean forward,
                      List<Candidate> candidates, Set<Long> seenSpans) {
        int cursor = from;
        int seen = 0;

        while (seen < WINDOW) {
            if (forward) {
                while (cursor < text.length() && Character.isWhitespace(text.charAt(cursor))) {
                    cursor++;
                }
                if (cursor >= text.length()) {
                    return;
                }
                int end = cursor;
                while (end < text.length() && !Character.isWhitespace(text.charAt(end))) {
                    end++;
                }
                String raw = text.substring(cursor, end);
                offer(text, cursor, end, candidates, seenSpans);
                if (raw.matches(".*[.!?][\"'`)\\]]*$")) {
                    return;
                }
                cursor = end;
            } else {
                while (cursor > 0 && Character.isWhitespace(text.charAt(cursor - 1))) {
                    cursor--;
                }
                if (cursor <= 0) {
                    return;
                }
                int start = cursor;
                while (start > 0 && !Character.isWhitespace(text.charAt(start - 1))) {
                    start--;
                }
                if (text.substring(start, cursor).matches(".*[.!?][\"'`)\\]]*$")) {
                    return;
                }
                offer(text, start, cursor, candidates, seenSpans);
                cursor = start;
            }
            seen++;
        }
    }

    /** Trim surrounding punctuation, then accept only a token that is entirely key-shaped. */
    private void offer(String text, int start, int end,
                       List<Candidate> candidates, Set<Long> seenSpans) {
        String raw = text.substring(start, end);

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

        if (end > start && (KEY_SHAPED.matcher(raw).matches() || base64KeyShaped(raw))) {
            addCandidate(candidates, seenSpans, start, end, raw);
        }
    }

    /**
     * Whether a token carrying '/' or '+' reads as base64 key material rather than as a
     * URL or a file path. Only such tokens reach here; anything {@link #KEY_SHAPED} already
     * accepted is decided exactly as it was before.
     *
     * <p>The discriminator is character-class composition, not entropy. Random base64 of
     * this length practically always carries all three of upper case, lower case and a
     * digit, whereas a URL or a path is overwhelmingly lower case
     * ("api.example.com/v1/users/profile", "/var/log/application/output.log") - one has to
     * be deliberately camel-cased AND carry a digit to survive, which the slash cap then
     * narrows further. A leading '/' (absolute path) and a "//" (URL remainder) are
     * rejected outright. A token with a scheme cannot reach here at all, since ':' is
     * outside the charset.
     *
     * <p>Known residual: a mixed-case path with a digit and at most three segments, e.g.
     * "S3/Bucket1/MyFolder/Data", still passes. Accepted deliberately - tightening further
     * starts costing real keys, and that is a shape people write rarely.
     */
    private boolean base64KeyShaped(String raw) {
        // Neither character present means this is KEY_SHAPED's business, not ours.
        if (raw.indexOf('/') < 0 && raw.indexOf('+') < 0) {
            return false;
        }
        if (!BASE64_SHAPED.matcher(raw).matches()) {
            return false;
        }
        if (raw.startsWith("/") || raw.contains("//")) {
            return false;
        }
        if (raw.chars().filter(c -> c == '/').count() > MAX_BASE64_SLASHES) {
            return false;
        }
        boolean upper = false;
        boolean lower = false;
        boolean digit = false;
        for (char c : raw.toCharArray()) {
            if (Character.isUpperCase(c)) {
                upper = true;
            } else if (Character.isLowerCase(c)) {
                lower = true;
            } else if (Character.isDigit(c)) {
                digit = true;
            }
        }
        return upper && lower && digit;
    }

    private void addCandidate(List<Candidate> candidates, Set<Long> seenSpans,
                              int start, int end, String value) {
        if (seenSpans.add(((long) start << 32) | (end & 0xffffffffL))) {
            candidates.add(new Candidate(start, end, value));
        }
    }

    @Override
    public double validate(String text, Candidate candidate) {
        return shannonEntropy(candidate.value()) >= ENTROPY_THRESHOLD ? CONFIDENCE : 0.0;
    }

    private double shannonEntropy(String value) {
        Map<Character, Integer> frequencies = new HashMap<>();
        for (char c : value.toCharArray()) {
            frequencies.merge(c, 1, Integer::sum);
        }
        double entropy = 0.0;
        int length = value.length();
        for (int count : frequencies.values()) {
            double probability = (double) count / length;
            entropy -= probability * (Math.log(probability) / Math.log(2));
        }
        return entropy;
    }
}
