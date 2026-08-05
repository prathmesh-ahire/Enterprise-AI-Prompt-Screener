package com.screener.detection;

import com.screener.model.DetectionFinding;
import com.screener.model.EntityType;
import org.junit.jupiter.api.Test;

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
}
