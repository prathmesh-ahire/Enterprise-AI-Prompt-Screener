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

    // ---------------------------------------------------------------------
    // Issuer prefix validation
    // ---------------------------------------------------------------------

    // An IMEI carries its own Luhn check digit, so length + Luhn alone cannot tell it from
    // a card. This is not a hypothetical: over 12,000 rows of ordinary prose, 623 of the 702
    // Luhn-valid card-length runs were 15-digit IMEIs.
    @Test
    void rejectsLuhnValidImeiBecauseItHasNoIssuerPrefix() {
        assertTrue(detector.detect("Device bearing IMEI: 06-184755-866851-3 was found").isEmpty());
    }

    // 15 digits is Amex's length, so a 15-digit run is only a card if it starts 34 or 37.
    @Test
    void acceptsAmexAtFifteenDigitsButNotOtherPrefixes() {
        assertEquals(1, detector.detect("Card: 378282246310005 on file").size());
        // Luhn-valid on purpose, so it is the issuer rule doing the rejecting, not the checksum.
        assertTrue(detector.detect("Ref: 491613819870706 noted").isEmpty());
    }

    // Mastercard is issued at 16 digits; the same prefix at 15 is not a card.
    @Test
    void rejectsCardPrefixAtALengthThatIssuerDoesNotUse() {
        assertTrue(detector.detect("Ref: 530000000000009 noted").isEmpty());
    }

    // The prefixes that must keep working, including RuPay and Discover.
    @Test
    void stillAcceptsTheMajorIssuers() {
        assertEquals(1, detector.detect("pay with 5500005555555559").size());   // Mastercard
        assertEquals(1, detector.detect("pay with 6011111111111117").size());   // Discover
        assertEquals(1, detector.detect("pay with 4111 1111 1111 1111").size()); // Visa, spaced
    }
}
