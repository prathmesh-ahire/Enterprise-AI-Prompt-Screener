package com.screener.detection;

import com.screener.model.DetectionFinding;
import com.screener.model.EntityType;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class AadhaarDetectorTest {

    private final AadhaarDetector detector = new AadhaarDetector();

    // Verhoeff-valid 12-digit test value (not a real Aadhaar number).
    @Test
    void detectsChecksumValidTwelveDigitNumber() {
        List<DetectionFinding> findings = detector.detect("Aadhaar: 234567890124 on record");
        assertEquals(1, findings.size());
        assertEquals(EntityType.AADHAAR_LIKE_ID, findings.get(0).getEntityType());
    }

    // Same shape as a 12-digit phone-like number but fails the Verhoeff checksum —
    // must not be flagged, per todo.md 8.6's example.
    @Test
    void rejectsPhoneLikeNumberThatFailsChecksum() {
        List<DetectionFinding> findings = detector.detect("Number seen: 987654321098 here");
        assertTrue(findings.isEmpty());
    }
}
