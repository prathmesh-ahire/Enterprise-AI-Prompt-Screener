package com.screener.service;

import com.screener.model.DetectionFinding;
import com.screener.model.EntityType;
import org.springframework.stereotype.Service;

import java.util.Comparator;
import java.util.List;
import java.util.Map;

/**
 * Replaces detected sensitive spans with safe placeholders (todo.md Phase 12). Never
 * logs or otherwise surfaces the original matched text anywhere in this class — only
 * a {@link DetectionFinding}'s entityType/position is ever touched, never the substring
 * itself (12.5).
 */
@Service
public class MaskingService {

    // Covers every EntityType 1:1 (todo.md 12.2) — deliberately no default/fallback
    // entry, so a future EntityType added without a matching placeholder fails loudly
    // here instead of silently leaking unmasked text.
    private static final Map<EntityType, String> PLACEHOLDERS = Map.of(
            EntityType.PERSONAL_EMAIL, "[EMAIL]",
            EntityType.PHONE_NUMBER, "[PHONE_NUMBER]",
            EntityType.PAYMENT_CARD, "[PAYMENT_CARD]",
            EntityType.API_KEY, "[SECRET_REMOVED]",
            EntityType.PASSWORD_SECRET, "[SECRET_REMOVED]",
            EntityType.PRIVATE_KEY, "[PRIVATE_KEY_REMOVED]",
            EntityType.PAN_LIKE_ID, "[GOVT_ID_REMOVED]",
            EntityType.AADHAAR_LIKE_ID, "[GOVT_ID_REMOVED]",
            EntityType.ORG_CONFIDENTIAL, "[INTERNAL_PROJECT]");

    // Same operation serves both the screening pipeline (Phase 13.1, which persists the
    // result as PromptRequest.maskedText) and the frontend's confirmation-screen preview
    // (Phase 26.2) — one method covers both 12.1 and 12.4, no reason for two near-
    // identical methods doing the same substitution.
    public String getMaskedPreview(String originalText, List<DetectionFinding> findings) {
        if (findings.isEmpty()) {
            return originalText;
        }

        // Replace right-to-left (highest startPos first) so replacing one span with a
        // placeholder of a different length never shifts the still-to-process indices of
        // any other finding (12.3). Relies on DetectionEngine having already resolved
        // true overlaps (Phase 9.6) before findings reach here — this only needs to
        // tolerate findings arriving unsorted, not genuinely overlapping spans.
        List<DetectionFinding> byStartDescending = findings.stream()
                .sorted(Comparator.comparingInt(DetectionFinding::getStartPos).reversed())
                .toList();

        StringBuilder masked = new StringBuilder(originalText);
        for (DetectionFinding finding : byStartDescending) {
            String placeholder = PLACEHOLDERS.get(finding.getEntityType());
            masked.replace(finding.getStartPos(), finding.getEndPos(), placeholder);
        }
        return masked.toString();
    }
}
