package com.screener.detection;

import com.screener.model.DetectionFinding;
import com.screener.model.EntityType;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * todo.md V1.2 Phase 50.4.
 *
 * <p>This detector had <b>no test at all</b> until this class — the only one of the nine
 * without one, and the reason a 14%-recall pass 1 survived from Phase 9 to V1.2. It drives
 * the "force at least MASK" hard override, so a miss here is a secret reaching the model.
 *
 * <p>The natural-phrasing cases below are the actual defect the user found:
 * {@code My password is Winter235@} was ALLOWed and forwarded while the identical secret
 * written {@code password=Winter235@} was correctly MASKed.
 */
class PasswordDetectorTest {

    private final PasswordDetector detector = new PasswordDetector();

    private boolean detects(String text) {
        return !detector.detect(text).isEmpty();
    }

    // ---------------------------------------------------------------------
    // Natural language — every one of these was missed before Phase 50
    // ---------------------------------------------------------------------
    @ParameterizedTest
    @ValueSource(strings = {
            "My password is Winter235@ please remember it",
            "my pwd is Winter235@",
            "passwd is Winter235@",
            "My passphrase is Correct-Horse-9",
            "The password for the shared account is Winter235@",
            "password Winter235@",
            "My password - Winter235@",
            "the password was changed to Tr0ub4dor&3",
            "set the password to N3wPassw0rd!",
            "Login: admin, password Winter235@",
    })
    void detectsSecretsWrittenInNaturalLanguage(String prompt) {
        assertTrue(detects(prompt), "should have detected a password in: " + prompt);
    }

    // ---------------------------------------------------------------------
    // The separator forms that already worked — must not regress
    // ---------------------------------------------------------------------
    @ParameterizedTest
    @ValueSource(strings = {
            "password=Winter235@",
            "password: Winter235@",
            "Here is my password=Winter235@ for the shared account.",
    })
    void stillDetectsTheOriginalSeparatorForms(String prompt) {
        assertTrue(detects(prompt), "regressed on the pre-Phase-50 form: " + prompt);
    }

    @ParameterizedTest
    @ValueSource(strings = {
            "password \"Winter235@\" for prod",
            "Use password (Winter235@) to log in",
            "password is Winter235@.",
    })
    void detectsQuotedBracketedAndSentenceFinalValues(String prompt) {
        assertTrue(detects(prompt), "should have detected a password in: " + prompt);
    }

    // ---------------------------------------------------------------------
    // False positives — a wider pass 1 is only safe if pass 2 holds these back
    // ---------------------------------------------------------------------
    @ParameterizedTest
    @ValueSource(strings = {
            "What is a strong password?",
            "How do I reset my password?",
            "I forgot my password",
            "password is required",
            "The password field is empty",
            "Can you help me choose a password?",
            "Explain password rotation policies",
            "My password is short",
            "The password was correct",
            "Write a poem about a password",
            "password must be 8 characters",
            "Our password policy requires rotation every 90 days",
            "My password manager is protected",
            "password expires in 30 days",
            "Password requirements: minimum 12 characters",
    })
    void ignoresSentencesThatMerelyMentionAPassword(String prompt) {
        assertFalse(detects(prompt), "false positive on: " + prompt);
    }

    @Test
    void ignoresABracketedTemplatePlaceholder() {
        assertFalse(detects("Set password=<password> in the config file."));
    }

    @Test
    void ignoresAWellKnownDummyValue() {
        assertFalse(detects("The default is password=changeme for now."));
    }

    @Test
    void ignoresAUrlNearTheKeyword() {
        assertFalse(detects("Reset your password at https://example.com/reset-a9f3"));
    }

    @Test
    void ignoresATimestampNearTheKeyword() {
        assertFalse(detects("Change your password before 2026-01-15T10:00:00Z"));
    }

    // An address is PERSONAL_EMAIL's finding, not this detector's - raising it here too
    // would double-count one value across two entity types and inflate the risk score.
    @Test
    void ignoresAnEmailAddressNearTheKeyword() {
        assertFalse(detects("The password for bob@corp.com needs resetting"));
    }

    // ---------------------------------------------------------------------
    // Positions — MaskingService replaces by these offsets, so they must be exact
    // ---------------------------------------------------------------------
    @Test
    void reportsOffsetsThatSliceBackOutToExactlyTheSecret() {
        String prompt = "My password is Winter235@ please remember it";
        List<DetectionFinding> findings = detector.detect(prompt);

        assertEquals(1, findings.size());
        DetectionFinding finding = findings.get(0);
        assertEquals(EntityType.PASSWORD_SECRET, finding.getEntityType());
        assertEquals("Winter235@", prompt.substring(finding.getStartPos(), finding.getEndPos()));
    }

    @Test
    void offsetsExcludeSurroundingQuotes() {
        String prompt = "password \"Winter235@\" for prod";
        DetectionFinding finding = detector.detect(prompt).get(0);
        assertEquals("Winter235@", prompt.substring(finding.getStartPos(), finding.getEndPos()));
    }

    @Test
    void offsetsExcludeATrailingFullStop() {
        String prompt = "password is Winter235@.";
        DetectionFinding finding = detector.detect(prompt).get(0);
        assertEquals("Winter235@", prompt.substring(finding.getStartPos(), finding.getEndPos()));
    }

    // Regression: "password=Winter235@" is ONE whitespace-delimited token, so the first
    // implementation captured "=Winter235@" - secret-shaped enough to be accepted, and it
    // would have masked to "password[SECRET_REMOVED]" with the separator swallowed.
    @Test
    void offsetsExcludeTheEqualsSeparatorWhenThereIsNoSpace() {
        String prompt = "password=Winter235@";
        DetectionFinding finding = detector.detect(prompt).get(0);
        assertEquals("Winter235@", prompt.substring(finding.getStartPos(), finding.getEndPos()));
    }

    @Test
    void offsetsExcludeTheColonSeparatorWhenThereIsNoSpace() {
        String prompt = "password:Winter235@";
        DetectionFinding finding = detector.detect(prompt).get(0);
        assertEquals("Winter235@", prompt.substring(finding.getStartPos(), finding.getEndPos()));
    }

    // ---------------------------------------------------------------------
    // Scan boundaries
    // ---------------------------------------------------------------------
    @Test
    void doesNotReachIntoTheFollowingSentence() {
        // The keyword's own sentence carries no secret; the next sentence's strong-looking
        // token belongs to a different statement.
        assertFalse(detects("I forgot my password. My cat is called Winter235@"));
    }

    @Test
    void detectsBothSecretsWhenTwoKeywordsAppear() {
        List<DetectionFinding> findings =
                detector.detect("password=Winter235@ and the passphrase is Tr0ub4dor&3");
        assertEquals(2, findings.size());
    }

    @Test
    void findsNothingInAPlainSentenceWithNoKeyword() {
        assertTrue(detector.detect("This is just a normal sentence with no secrets at all").isEmpty());
    }

    // ---------------------------------------------------------------------
    // Backward scan and plural keywords (todo.md V1.2 Phase 53.7)
    // ---------------------------------------------------------------------

    // The scan used to run forward only, so a value stated before the keyword was unreachable.
    @Test
    void detectsWhenTheValueComesBeforeTheKeyword() {
        assertTrue(detects("Use Xk9#mQ2vLp as your password"));
        assertTrue(detects("Winter235@ is my password, please keep it safe"));
    }

    // Mirror of doesNotReachIntoTheFollowingSentence: going backward, a token that ends a
    // sentence belongs to the PREVIOUS statement, so the scan must stop before it.
    @Test
    void doesNotReachBackIntoThePrecedingSentence() {
        assertFalse(detects("My cat is called Winter235@. I forgot my password"));
    }

    // "recite passwords, with X being most repeated" - the plural was not a keyword at all.
    @Test
    void detectsPluralAndPasscodeKeywords() {
        assertTrue(detects("remember and recite passwords, with Winter235@ being most repeated"));
        assertTrue(detects("please use the passcode N3wPassw0rd! to join"));
    }

    // "pass" must stay bounded: widening it to a prefix would fire on ordinary words.
    @Test
    void doesNotTreatOrdinaryPassWordsAsKeywords() {
        assertFalse(detects("The passenger boarding Fl1ght#7788 was delayed"));
        assertFalse(detects("Her passport number Xk9#mQ2vLp is on file"));
    }
}
