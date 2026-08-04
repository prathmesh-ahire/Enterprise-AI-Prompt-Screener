package com.screener.service;

import com.screener.detection.DetectionEngine;
import com.screener.model.DetectionFinding;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;

/**
 * Checks an AI response for leaked sensitive data before it's shown to the user
 * (todo.md Phase 16). Two independent checks (16.2/16.3), either one withholds the
 * response.
 *
 * <p>16.5's SAFE/WITHHELD audit write now goes through {@link AuditService} (Phase 17.1)
 * — this used to write {@code AuditEvent} rows directly since {@code AuditService} didn't
 * exist yet when Phase 16 was built; see docs/NOTE.md.
 */
@Service
@RequiredArgsConstructor
public class ResponseSafetyChecker {

    static final String SAFE_ACTION = "SAFE";
    static final String WITHHELD_ACTION = "WITHHELD";
    static final String WITHHELD_MESSAGE =
            "The AI response was withheld because it may contain sensitive information. "
                    + "Please contact your reviewer.";

    private final DetectionEngine detectionEngine;
    private final AuditService auditService;

    public SafetyCheckResult check(String responseText, String originalPromptText,
                                    List<DetectionFinding> originalFindings, UUID requestId, Long userId,
                                    String riskBand) {
        boolean unsafe = responseContainsNewSensitiveData(responseText)
                || responseReproducesAMaskedValue(responseText, originalPromptText, originalFindings);

        auditService.log(userId, unsafe ? WITHHELD_ACTION : SAFE_ACTION, requestId, riskBand);

        return unsafe ? new SafetyCheckResult(false, WITHHELD_MESSAGE)
                : new SafetyCheckResult(true, responseText);
    }

    // 16.2: the response is its own untrusted text — run the same 9 detectors on it that
    // ran on the prompt.
    private boolean responseContainsNewSensitiveData(String responseText) {
        return !detectionEngine.detectAll(responseText).isEmpty();
    }

    // 16.3: flag only if the exact masked VALUE reappears, not merely the same entity
    // TYPE — flagging on type alone would withhold almost every response whenever the
    // prompt had any finding, which 16.2 already covers on its own.
    private boolean responseReproducesAMaskedValue(String responseText, String originalPromptText,
                                                     List<DetectionFinding> originalFindings) {
        for (DetectionFinding finding : originalFindings) {
            String originalValue = originalPromptText.substring(finding.getStartPos(), finding.getEndPos());
            if (!originalValue.isBlank() && responseText.contains(originalValue)) {
                return true;
            }
        }
        return false;
    }
}
