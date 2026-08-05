package com.screener.detection;

import com.screener.model.DetectionFinding;
import com.screener.model.EntityType;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class EmailDetectorTest {

    private final EmailDetector detector = new EmailDetector();

    @Test
    void detectsWellFormedEmail() {
        List<DetectionFinding> findings = detector.detect("Contact me at john.doe@example.com please");
        assertEquals(1, findings.size());
        assertEquals(EntityType.PERSONAL_EMAIL, findings.get(0).getEntityType());
    }

    @Test
    void rejectsLookAlikeWithMalformedDomain() {
        List<DetectionFinding> findings = detector.detect("reach user@ex..com if needed");
        assertTrue(findings.isEmpty());
    }

    @Test
    void findsNothingWhenNoEmailIsPresent() {
        List<DetectionFinding> findings = detector.detect("This message has no address in it at all");
        assertTrue(findings.isEmpty());
    }

    @Test
    void detectsMultipleDistinctEmails() {
        List<DetectionFinding> findings = detector.detect("Send to alice@example.com and bob@example.org please");
        assertEquals(2, findings.size());
        assertEquals(EntityType.PERSONAL_EMAIL, findings.get(0).getEntityType());
        assertEquals(EntityType.PERSONAL_EMAIL, findings.get(1).getEntityType());
    }
}
