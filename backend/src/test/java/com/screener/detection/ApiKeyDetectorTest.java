package com.screener.detection;

import com.screener.model.DetectionFinding;
import com.screener.model.EntityType;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class ApiKeyDetectorTest {

    private final ApiKeyDetector detector = new ApiKeyDetector();

    @Test
    void detectsApiKeyKeywordFollowedByHighEntropyToken() {
        List<DetectionFinding> findings = detector.detect("api_key=Zx9pQ7rT2vLm4wN8sK1dJh6 in the config");
        assertEquals(1, findings.size());
        assertEquals(EntityType.API_KEY, findings.get(0).getEntityType());
    }

    @Test
    void detectsBearerKeywordFollowedByHighEntropyToken() {
        List<DetectionFinding> findings = detector.detect("Authorization: Bearer sk-Zx9pQ7rT2vLm4wN8sK1dJh6");
        assertEquals(1, findings.size());
        assertEquals(EntityType.API_KEY, findings.get(0).getEntityType());
    }

    @Test
    void findsNothingInAPlainSentenceWithNoKey() {
        List<DetectionFinding> findings = detector.detect("This is just a normal sentence with no secrets at all");
        assertTrue(findings.isEmpty());
    }

    // 37.2: found live - an underscore-prefixed keyword ("test_api_key", not "api_key")
    // used to fail the leading \b boundary entirely, and the 19-char example value used
    // to fall 1 character short of the old 20-char floor. See docs/NOTE.md.
    @Test
    void detectsAnUnderscorePrefixedKeywordWithAShorterRealisticToken() {
        List<DetectionFinding> findings = detector.detect("test_api_key=sk-12345abcdefghijk");
        assertEquals(1, findings.size());
        assertEquals(EntityType.API_KEY, findings.get(0).getEntityType());
    }

    // V1.2 Phase 50.3. All four of these matched NOTHING before: "api key" as two words
    // was not a keyword at all (only apikey/api_key/api-key were), "secret key" and
    // "access key" were not keywords, and an "is"/"was" between the keyword and the value
    // broke the match because the value had to follow the keyword or a separator directly.
    @ParameterizedTest
    @ValueSource(strings = {
            "my api key is Zx9pQ7rT2vLm4wN8sK1dJh6",
            "the API Key: Zx9pQ7rT2vLm4wN8sK1dJh6",
            "my secret key is Zx9pQ7rT2vLm4wN8sK1dJh6",
            "API KEY Zx9pQ7rT2vLm4wN8sK1dJh6",
            "access key was Zx9pQ7rT2vLm4wN8sK1dJh6",
    })
    void detectsKeysReferredToInNaturalLanguage(String prompt) {
        List<DetectionFinding> findings = detector.detect(prompt);
        assertEquals(1, findings.size(), "should have detected a key in: " + prompt);
        assertEquals(EntityType.API_KEY, findings.get(0).getEntityType());
    }

    // The widened keyword list must not cost any precision: pass 2's length and entropy
    // bars are unchanged, and they are what hold these back.
    @ParameterizedTest
    @ValueSource(strings = {
            "api_key=aaaaaaaaaaaaaaaaaaaaaa",
            "Please explain what an api_key is used for.",
            "What is an API key and how do I get one?",
            "my api key is short",
            "Rotate the access key every 90 days",
            "Tokens expire after one hour",
    })
    void ignoresMentionsThatCarryNoActualKey(String prompt) {
        assertTrue(detector.detect(prompt).isEmpty(), "false positive on: " + prompt);
    }

    // Post-54 bugfix. Base64 key material containing '/' or '+' was missed entirely,
    // because KEY_SHAPED's charset has neither. The AWS secret access key below is the
    // headline case: 40 base64 characters that split into 13/7/18-character fragments,
    // none of which reached the 16-character bar, so the whole prompt screened ALLOW with
    // no findings and the secret was forwarded to the model. See docs/NOTE.md.
    @ParameterizedTest
    @ValueSource(strings = {
            "aws_secret_access_key = wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
            "my client secret is wJalrXUtnFEMI/K7MDENG/bPxRfiCYEX",
            "the api key is aGVsbG8rd29ybGQvc2VjcmV0K1Rva2VuMQ",
            "token: abc+def/ghiJKL123mnoPQR456stu",
    })
    void detectsBase64KeyMaterialContainingSlashOrPlus(String prompt) {
        List<DetectionFinding> findings = detector.detect(prompt);
        assertEquals(1, findings.size(), "should have detected a key in: " + prompt);
        assertEquals(EntityType.API_KEY, findings.get(0).getEntityType());
    }

    // The precision half of the same fix, and the reason '/' was not simply added to
    // KEY_SHAPED. Every string below clears the 3.5 bits/char entropy bar, so entropy
    // alone would have let all of them through as API keys: a URL measures 4.11 and a log
    // path 3.87, against 4.66 for the AWS key above. What holds them back is
    // character-class composition plus the leading-slash, "//" and slash-count rules.
    @ParameterizedTest
    @ValueSource(strings = {
            "the auth token endpoint is api.example.com/v1/users/profile",
            "the credentials file is /var/log/application/service/output.log",
            "our credentials live in config/secrets/production/values.yaml",
            "the api key docs are at https://api.example.com/v1/Users/Profile2",
            "fetch the access key from //cdn.example.com/Assets/Build7/key",
            "the token path is Reports/Q3/Region4/Summary/Archive/Final2",
    })
    void doesNotMistakeUrlsAndFilePathsForBase64Keys(String prompt) {
        assertTrue(detector.detect(prompt).isEmpty(), "false positive on: " + prompt);
    }

    // PrivateKeyDetector owns PEM blocks. "private key" is deliberately absent from this
    // detector's keyword list so one secret never raises two competing findings.
    @Test
    void doesNotClaimPrivateKeyWhichAnotherDetectorOwns() {
        assertTrue(detector.detect("my private key is Zx9pQ7rT2vLm4wN8sK1dJh6").isEmpty());
    }
}
