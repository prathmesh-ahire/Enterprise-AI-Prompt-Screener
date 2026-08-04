package com.screener.service;

import com.screener.detection.DetectionEngine;
import com.screener.model.AuditEvent;
import com.screener.model.DetectionFinding;
import com.screener.repository.AuditEventRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

/**
 * Checks an AI response for leaked sensitive data before it's shown to the user
 * (todo.md Phase 16). Two independent checks (16.2/16.3), either one withholds the
 * response.
 *
 * <p>16.5 asks to save the SAFE/WITHHELD result to {@code AuditEvent} — the full
 * {@code AuditService} (login/logout/etc.) isn't built until Phase 17, so this writes
 * directly via the already-existing {@code AuditEventRepository} rather than waiting on
 * that service. Phase 17.2 can fold this into a shared helper once `AuditService` exists;
 * see docs/NOTE.md.
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
    private final AuditEventRepository auditEventRepository;

    public SafetyCheckResult check(String responseText, String originalPromptText,
                                    List<DetectionFinding> originalFindings, UUID requestId, Long userId,
                                    String riskBand) {
        boolean unsafe = responseContainsNewSensitiveData(responseText)
                || responseReproducesAMaskedValue(responseText, originalPromptText, originalFindings);

        saveAuditEvent(userId, unsafe ? WITHHELD_ACTION : SAFE_ACTION, requestId, riskBand);

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

    private void saveAuditEvent(Long userId, String action, UUID requestId, String riskBand) {
        AuditEvent event = new AuditEvent();
        event.setUserId(userId);
        event.setAction(action);
        event.setRequestId(requestId);
        event.setRiskBand(riskBand);
        event.setCreatedAt(LocalDateTime.now());
        auditEventRepository.save(event);
    }
}
