package com.screener.detection;

import com.screener.model.DetectionFinding;
import com.screener.model.EntityType;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class PanDetectorTest {

    private final PanDetector detector = new PanDetector();

    @Test
    void detectsPanWithValidHolderTypeCode() {
        List<DetectionFinding> findings = detector.detect("PAN on file: ABCPE1234F");
        assertEquals(1, findings.size());
        assertEquals(EntityType.PAN_LIKE_ID, findings.get(0).getEntityType());
    }

    @Test
    void rejectsLookAlikeWithInvalidHolderTypeCode() {
        List<DetectionFinding> findings = detector.detect("Ref code: ABCXE1234F");
        assertTrue(findings.isEmpty());
    }
}
