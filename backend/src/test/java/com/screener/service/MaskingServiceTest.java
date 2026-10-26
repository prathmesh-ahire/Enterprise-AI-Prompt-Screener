package com.screener.service;

import com.screener.model.DetectionFinding;
import com.screener.model.EntityType;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;

class MaskingServiceTest {

    private final MaskingService maskingService = new MaskingService();

    @Test
    void masksASingleFinding() {
        String text = "My email is a@b.com today";
        int start = text.indexOf("a@b.com");
        int end = start + "a@b.com".length();

        String masked = maskingService.getMaskedPreview(text, List.of(finding(EntityType.PERSONAL_EMAIL, start, end)));

        assertEquals("My email is [EMAIL] today", masked);
    }

    // The "overlapping findings" case: two separate positions
    // sharing the same underlying value (this project's established meaning for
    // "overlapping" from the start), not two findings whose character ranges genuinely
    // intersect - MaskingService documents (see its own class comment) that it relies on
    // DetectionEngine to have already resolved true overlaps before findings reach here.
    @Test
    void masksTheSameValueAppearingTwiceInTheText() {
        String text = "Email me at a@b.com or backup a@b.com if that fails";
        int firstStart = text.indexOf("a@b.com");
        int firstEnd = firstStart + "a@b.com".length();
        int secondStart = text.indexOf("a@b.com", firstEnd);
        int secondEnd = secondStart + "a@b.com".length();

        List<DetectionFinding> findings = List.of(
                finding(EntityType.PERSONAL_EMAIL, firstStart, firstEnd),
                finding(EntityType.PERSONAL_EMAIL, secondStart, secondEnd));

        String masked = maskingService.getMaskedPreview(text, findings);

        assertEquals("Email me at [EMAIL] or backup [EMAIL] if that fails", masked);
        assertFalse(masked.contains("a@b.com"));
    }

    @Test
    void masksMultipleFindingsGivenOutOfOrderWithDifferentPlaceholderLengths() {
        String text = "Card 4111111111111111 and key sk_live_abcdefghijklmnop end";
        int cardStart = text.indexOf("4111111111111111");
        int cardEnd = cardStart + "4111111111111111".length();
        int keyStart = text.indexOf("sk_live_abcdefghijklmnop");
        int keyEnd = keyStart + "sk_live_abcdefghijklmnop".length();

        // Deliberately passed out of position order (key finding before card finding) to
        // confirm the service sorts them itself rather than relying on caller order, and
        // that a shorter/longer placeholder never corrupts an already-processed span.
        List<DetectionFinding> findings = List.of(
                finding(EntityType.API_KEY, keyStart, keyEnd),
                finding(EntityType.PAYMENT_CARD, cardStart, cardEnd));

        String masked = maskingService.getMaskedPreview(text, findings);

        assertEquals("Card [PAYMENT_CARD] and key [SECRET_REMOVED] end", masked);
    }

    @Test
    void returnsOriginalTextUnchangedWhenThereAreNoFindings() {
        String text = "Nothing sensitive here";
        assertEquals(text, maskingService.getMaskedPreview(text, List.of()));
    }

    private DetectionFinding finding(EntityType type, int start, int end) {
        DetectionFinding finding = new DetectionFinding();
        finding.setEntityType(type);
        finding.setStartPos(start);
        finding.setEndPos(end);
        finding.setConfidence(0.9);
        return finding;
    }
}
