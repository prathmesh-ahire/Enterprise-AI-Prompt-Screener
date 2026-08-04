package com.screener.service;

import com.screener.model.AuditEvent;
import com.screener.repository.AuditEventRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class AuditServiceTest {

    @Mock
    private AuditEventRepository auditEventRepository;

    @Test
    void logSavesExactlyTheFiveAllowedFields() {
        AuditService auditService = new AuditService(auditEventRepository);
        UUID requestId = UUID.randomUUID();

        auditService.log(7L, "LOGIN", requestId, "ALLOW");

        ArgumentCaptor<AuditEvent> captor = ArgumentCaptor.forClass(AuditEvent.class);
        verify(auditEventRepository).save(captor.capture());
        AuditEvent saved = captor.getValue();

        assertEquals(7L, saved.getUserId());
        assertEquals("LOGIN", saved.getAction());
        assertEquals(requestId, saved.getRequestId());
        assertEquals("ALLOW", saved.getRiskBand());
        assertNotNull(saved.getCreatedAt());
    }

    @Test
    void logAllowsNullRequestIdAndRiskBandForNonPromptEvents() {
        AuditService auditService = new AuditService(auditEventRepository);

        auditService.log(7L, "LOGOUT", null, null);

        ArgumentCaptor<AuditEvent> captor = ArgumentCaptor.forClass(AuditEvent.class);
        verify(auditEventRepository).save(captor.capture());
        AuditEvent saved = captor.getValue();

        assertEquals("LOGOUT", saved.getAction());
        assertNull(saved.getRequestId());
        assertNull(saved.getRiskBand());
    }
}
