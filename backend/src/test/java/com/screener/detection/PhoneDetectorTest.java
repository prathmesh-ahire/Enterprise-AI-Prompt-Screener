package com.screener.detection;

import com.screener.model.DetectionFinding;
import com.screener.model.EntityType;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class PhoneDetectorTest {

    private final PhoneDetector detector = new PhoneDetector();

    @Test
    void detectsIsolatedTenDigitMobileNumber() {
        List<DetectionFinding> findings = detector.detect("Call me on 9876543210 today");
        assertEquals(1, findings.size());
        assertEquals(EntityType.PHONE_NUMBER, findings.get(0).getEntityType());
    }

    @Test
    void rejectsMatchEmbeddedInLongerDigitRun() {
        List<DetectionFinding> findings = detector.detect("Reference code 19876543210 on file");
        assertTrue(findings.isEmpty());
    }

    @Test
    void rejectsTooShortNumber() {
        List<DetectionFinding> findings = detector.detect("Call me on 987654321 today");
        assertTrue(findings.isEmpty());
    }
}
