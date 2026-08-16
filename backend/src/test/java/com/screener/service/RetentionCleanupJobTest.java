package com.screener.service;

import com.screener.model.PromptRequest;
import com.screener.model.SystemConfig;
import com.screener.repository.DetectionFindingRepository;
import com.screener.repository.PromptRequestRepository;
import com.screener.repository.RiskSignalRepository;
import com.screener.repository.ScreeningDecisionRepository;
import com.screener.repository.SystemConfigRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class RetentionCleanupJobTest {

    @Mock private SystemConfigRepository systemConfigRepository;
    @Mock private PromptRequestRepository promptRequestRepository;
    @Mock private DetectionFindingRepository detectionFindingRepository;
    @Mock private RiskSignalRepository riskSignalRepository;
    @Mock private ScreeningDecisionRepository screeningDecisionRepository;

    private RetentionCleanupJob job;

    @BeforeEach
    void setUp() {
        job = new RetentionCleanupJob(systemConfigRepository, promptRequestRepository,
                detectionFindingRepository, riskSignalRepository, screeningDecisionRepository);
    }

    @Test
    void deletesExpiredRequestsAndTheirRelatedRowsUsingTheConfiguredRetentionDays() {
        SystemConfig config = new SystemConfig();
        config.setConfigKey("retention_days");
        config.setConfigValue("30");
        when(systemConfigRepository.findByConfigKey("retention_days")).thenReturn(Optional.of(config));

        UUID requestId = UUID.randomUUID();
        PromptRequest expired = new PromptRequest();
        expired.setRequestId(requestId);
        expired.setSubmittedAt(LocalDateTime.now().minusDays(40));
        when(promptRequestRepository.findBySubmittedAtBefore(any())).thenReturn(List.of(expired));

        job.purgeExpiredPromptRequests();

        verify(detectionFindingRepository).deleteByRequestIdIn(List.of(requestId));
        verify(riskSignalRepository).deleteByRequestIdIn(List.of(requestId));
        verify(screeningDecisionRepository).deleteByRequestIdIn(List.of(requestId));
        verify(promptRequestRepository).deleteAll(List.of(expired));

        ArgumentCaptor<LocalDateTime> cutoffCaptor = ArgumentCaptor.forClass(LocalDateTime.class);
        verify(promptRequestRepository).findBySubmittedAtBefore(cutoffCaptor.capture());
        LocalDateTime expectedCutoff = LocalDateTime.now().minusDays(30);
        assertEquals(expectedCutoff.toLocalDate(), cutoffCaptor.getValue().toLocalDate());
    }

    @Test
    void doesNothingWhenNoRequestsAreExpired() {
        when(systemConfigRepository.findByConfigKey("retention_days")).thenReturn(Optional.empty());
        when(promptRequestRepository.findBySubmittedAtBefore(any())).thenReturn(List.of());

        job.purgeExpiredPromptRequests();

        verify(detectionFindingRepository, never()).deleteByRequestIdIn(any());
        verify(promptRequestRepository, never()).deleteAll(any());
    }
}
