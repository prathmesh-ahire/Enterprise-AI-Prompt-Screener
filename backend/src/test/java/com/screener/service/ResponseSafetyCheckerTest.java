package com.screener.service;

import com.screener.detection.DetectionEngine;
import com.screener.model.AuditEvent;
import com.screener.model.DetectionFinding;
import com.screener.model.EntityType;
import com.screener.repository.AuditEventRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ResponseSafetyCheckerTest {

    @Mock
    private DetectionEngine detectionEngine;

    @Mock
    private AuditEventRepository auditEventRepository;

    private ResponseSafetyChecker checker;

    @BeforeEach
    void setUp() {
        checker = new ResponseSafetyChecker(detectionEngine, auditEventRepository);
    }

    @Test
    void withholdsWhenResponseContainsItsOwnSensitiveDataFinding() {
        String response = "Sure, my email is leaked@example.com";
        when(detectionEngine.detectAll(response)).thenReturn(List.of(finding(EntityType.PERSONAL_EMAIL, 0, 5)));

        SafetyCheckResult result = checker.check(response, "original text", List.of(), UUID.randomUUID(), 1L, "ALLOW");

        assertFalse(result.safe());
        assertEquals(ResponseSafetyChecker.WITHHELD_MESSAGE, result.responseText());
        verifyAuditAction(ResponseSafetyChecker.WITHHELD_ACTION);
    }

    @Test
    void withholdsWhenResponseReproducesTheExactMaskedValueEvenIfNotIndependentlyDetected() {
        String originalPrompt = "My secret code is XZQ-9182-FLIP";
        int start = originalPrompt.indexOf("XZQ-9182-FLIP");
        int end = start + "XZQ-9182-FLIP".length();
        DetectionFinding orgFinding = finding(EntityType.ORG_CONFIDENTIAL, start, end);

        String response = "Noted - your secret code is XZQ-9182-FLIP, keep it safe.";
        when(detectionEngine.detectAll(response)).thenReturn(List.of());

        SafetyCheckResult result =
                checker.check(response, originalPrompt, List.of(orgFinding), UUID.randomUUID(), 1L, "MASK");

        assertFalse(result.safe());
        assertEquals(ResponseSafetyChecker.WITHHELD_MESSAGE, result.responseText());
        verifyAuditAction(ResponseSafetyChecker.WITHHELD_ACTION);
    }

    @Test
    void allowsASafeResponseThatContainsNoSensitiveDataAndNoReproducedValue() {
        String originalPrompt = "My email is a@b.com";
        int start = originalPrompt.indexOf("a@b.com");
        int end = start + "a@b.com".length();
        DetectionFinding orgFinding = finding(EntityType.PERSONAL_EMAIL, start, end);

        String response = "Here is some general help with your question.";
        when(detectionEngine.detectAll(response)).thenReturn(List.of());

        SafetyCheckResult result =
                checker.check(response, originalPrompt, List.of(orgFinding), UUID.randomUUID(), 1L, "ALLOW");

        assertTrue(result.safe());
        assertEquals(response, result.responseText());
        verifyAuditAction(ResponseSafetyChecker.SAFE_ACTION);
    }

    private void verifyAuditAction(String expectedAction) {
        ArgumentCaptor<AuditEvent> captor = ArgumentCaptor.forClass(AuditEvent.class);
        verify(auditEventRepository).save(captor.capture());
        assertEquals(expectedAction, captor.getValue().getAction());
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
