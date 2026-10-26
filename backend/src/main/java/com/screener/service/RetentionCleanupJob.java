package com.screener.service;

import com.screener.model.PromptRequest;
import com.screener.model.SystemConfig;
import com.screener.repository.DetectionFindingRepository;
import com.screener.repository.PromptRequestRepository;
import com.screener.repository.RiskSignalRepository;
import com.screener.repository.ScreeningDecisionRepository;
import com.screener.repository.SystemConfigRepository;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

/**
 * Runs once daily, purges {@code prompt_requests} (and their
 * {@code detection_findings}/{@code risk_signals}/{@code screening_decisions}) older than
 * the configured retention-days value. Without this the retention-days setting
 * would be purely decorative, since raw prompt text is otherwise stored permanently. Deliberately leaves {@code review_records}/{@code audit_events}
 * alone — only these three tables are in scope, and the audit trail is meant to
 * outlive the raw prompt data it was recorded about.
 */
@Component
@RequiredArgsConstructor
public class RetentionCleanupJob {

    private static final Logger log = LoggerFactory.getLogger(RetentionCleanupJob.class);

    // Public: AdminService reads/writes this same key and default.
    public static final String RETENTION_DAYS_KEY = "retention_days";
    public static final int DEFAULT_RETENTION_DAYS = 90;

    private final SystemConfigRepository systemConfigRepository;
    private final PromptRequestRepository promptRequestRepository;
    private final DetectionFindingRepository detectionFindingRepository;
    private final RiskSignalRepository riskSignalRepository;
    private final ScreeningDecisionRepository screeningDecisionRepository;

    @Scheduled(cron = "0 0 2 * * *")
    public void purgeExpiredPromptRequests() {
        LocalDateTime cutoff = LocalDateTime.now().minusDays(resolveRetentionDays());
        List<PromptRequest> expired = promptRequestRepository.findBySubmittedAtBefore(cutoff);
        if (expired.isEmpty()) {
            log.debug("Retention cleanup: nothing older than cutoff {}", cutoff);
            return;
        }

        List<UUID> requestIds = expired.stream().map(PromptRequest::getRequestId).toList();
        detectionFindingRepository.deleteByRequestIdIn(requestIds);
        riskSignalRepository.deleteByRequestIdIn(requestIds);
        screeningDecisionRepository.deleteByRequestIdIn(requestIds);
        promptRequestRepository.deleteAll(expired);
        log.info("Retention cleanup purged {} prompt request(s) older than cutoff {}", expired.size(), cutoff);
    }

    private int resolveRetentionDays() {
        return systemConfigRepository.findByConfigKey(RETENTION_DAYS_KEY)
                .map(SystemConfig::getConfigValue)
                .map(Integer::parseInt)
                .orElse(DEFAULT_RETENTION_DAYS);
    }
}
