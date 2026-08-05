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
}
