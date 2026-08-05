package com.screener.detection;

import com.screener.model.DetectionFinding;
import com.screener.model.EntityType;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class PaymentCardDetectorTest {

    private final PaymentCardDetector detector = new PaymentCardDetector();

    // Well-known Luhn-valid test Visa number (not a real card).
    @Test
    void detectsLuhnValidCard() {
        List<DetectionFinding> findings = detector.detect("Card: 4111111111111111 on file");
        assertEquals(1, findings.size());
        assertEquals(EntityType.PAYMENT_CARD, findings.get(0).getEntityType());
    }

    // Same number with the last digit changed - card-length but fails the checksum.
    @Test
    void rejectsLuhnInvalidNumber() {
        List<DetectionFinding> findings = detector.detect("Card: 4111111111111112 on file");
        assertTrue(findings.isEmpty());
    }

    // A 16-digit run in card-candidate range that isn't a real card number at all (e.g. a
    // government-ID-style sequence) - must fail the Luhn check the same as any other
    // non-card number, not be waved through just because it's card-length.
    @Test
    void rejectsSixteenDigitNonCardNumber() {
        List<DetectionFinding> findings = detector.detect("Reference: 1234567890123456 noted");
        assertTrue(findings.isEmpty());
    }
}
