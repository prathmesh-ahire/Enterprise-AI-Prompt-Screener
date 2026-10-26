package com.screener.service;

import com.screener.dto.DashboardSummaryDto;
import com.screener.dto.EntityStatDto;
import com.screener.dto.ProcessingTimeStatsDto;
import com.screener.dto.RecentBlockedDto;
import com.screener.dto.RepeatedViolationDto;
import com.screener.dto.RiskBandStatDto;
import com.screener.model.Decision;
import com.screener.model.DetectionFinding;
import com.screener.model.EntityType;
import com.screener.model.ScreeningDecision;
import com.screener.repository.AuditEventRepository;
import com.screener.repository.DetectionFindingRepository;
import com.screener.repository.ScreeningDecisionRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class DashboardServiceTest {

    @Mock private ScreeningDecisionRepository screeningDecisionRepository;
    @Mock private DetectionFindingRepository detectionFindingRepository;
    @Mock private AuditEventRepository auditEventRepository;

    private DashboardService dashboardService;

    @BeforeEach
    void setUp() {
        dashboardService = new DashboardService(screeningDecisionRepository, detectionFindingRepository, auditEventRepository);
    }

    @Test
    void summaryTotalsAcrossAllBandsAndExposesTheFourNamedOnes() {
        when(screeningDecisionRepository.countByDecisionSince(any())).thenReturn(List.of(
                new Object[]{Decision.ALLOW, 5L},
                new Object[]{Decision.MASK, 3L},
                new Object[]{Decision.CONFIRM, 1L},
                new Object[]{Decision.REVIEW, 2L},
                new Object[]{Decision.BLOCK, 4L}));

        DashboardSummaryDto summary = dashboardService.getSummary();

        assertEquals(15, summary.total());
        assertEquals(5, summary.allowed());
        assertEquals(3, summary.masked());
        assertEquals(4, summary.blocked());
        assertEquals(2, summary.pendingReview());
    }

    @Test
    void summaryDefaultsMissingBandsToZero() {
        when(screeningDecisionRepository.countByDecisionSince(any()))
                .thenReturn(List.<Object[]>of(new Object[]{Decision.ALLOW, 5L}));

        DashboardSummaryDto summary = dashboardService.getSummary();

        assertEquals(5, summary.total());
        assertEquals(0, summary.masked());
        assertEquals(0, summary.blocked());
        assertEquals(0, summary.pendingReview());
    }

    @Test
    void entityStatsMapsEachRow() {
        when(detectionFindingRepository.countGroupedByEntityType()).thenReturn(List.of(
                new Object[]{EntityType.PERSONAL_EMAIL, 7L},
                new Object[]{EntityType.API_KEY, 2L}));

        List<EntityStatDto> stats = dashboardService.getEntityStats();

        assertEquals(2, stats.size());
        assertEquals(new EntityStatDto("PERSONAL_EMAIL", 7L), stats.get(0));
    }

    @Test
    void riskDistributionCoversAllFiveBandsIncludingConfirm() {
        when(screeningDecisionRepository.countByDecisionSince(any()))
                .thenReturn(List.<Object[]>of(new Object[]{Decision.CONFIRM, 6L}));

        List<RiskBandStatDto> distribution = dashboardService.getRiskDistribution();

        assertEquals(List.of(new RiskBandStatDto("CONFIRM", 6L)), distribution);
    }

    @Test
    void recentBlockedPicksTheMostSevereFindingAsTheTrigger() {
        UUID requestId = UUID.randomUUID();
        ScreeningDecision decision = new ScreeningDecision();
        decision.setRequestId(requestId);
        decision.setTimestamp(LocalDateTime.now());
        decision.setRiskScore(90.0);

        when(screeningDecisionRepository.findTop10ByDecisionOrderByTimestampDesc(Decision.BLOCK))
                .thenReturn(List.of(decision));
        when(detectionFindingRepository.findByRequestId(requestId))
                .thenReturn(List.of(finding(EntityType.PERSONAL_EMAIL), finding(EntityType.PRIVATE_KEY)));

        List<RecentBlockedDto> result = dashboardService.getRecentBlocked();

        assertEquals(1, result.size());
        assertEquals("PRIVATE_KEY", result.get(0).triggeringEntityType());
    }

    @Test
    void recentBlockedTriggerIsNullWhenThereAreNoFindings() {
        UUID requestId = UUID.randomUUID();
        ScreeningDecision decision = new ScreeningDecision();
        decision.setRequestId(requestId);
        decision.setTimestamp(LocalDateTime.now());
        decision.setRiskScore(80.0);

        when(screeningDecisionRepository.findTop10ByDecisionOrderByTimestampDesc(Decision.BLOCK))
                .thenReturn(List.of(decision));
        when(detectionFindingRepository.findByRequestId(requestId)).thenReturn(List.of());

        List<RecentBlockedDto> result = dashboardService.getRecentBlocked();

        assertNull(result.get(0).triggeringEntityType());
    }

    @Test
    void processingTimeStatsUsesTheGivenRange() {
        when(screeningDecisionRepository.processingTimeStatsBetween(any(), any()))
                .thenReturn(List.<Object[]>of(new Object[]{120.5, 900L}));

        ProcessingTimeStatsDto stats = dashboardService.getProcessingTimeStats(LocalDate.of(2026, 1, 1), LocalDate.of(2026, 1, 31));

        assertEquals(120.5, stats.averageMs());
        assertEquals(900L, stats.maxMs());
    }

    @Test
    void processingTimeStatsHandlesNoDataAsNulls() {
        when(screeningDecisionRepository.processingTimeStatsBetween(any(), any()))
                .thenReturn(List.<Object[]>of(new Object[]{null, null}));

        ProcessingTimeStatsDto stats = dashboardService.getProcessingTimeStats(null, null);

        assertNull(stats.averageMs());
        assertNull(stats.maxMs());
    }

    // the query now returns (userId, username, count) so the panel can name the user
    // instead of showing a bare numeric id.
    @Test
    void repeatedViolationsMapsUserIdUsernameAndCount() {
        when(auditEventRepository.findUserIdsWithActionCountAtLeast(eq(List.of("BLOCK", "REVIEW")), any(), eq(3L)))
                .thenReturn(List.<Object[]>of(new Object[]{42L, "demo_user3", 5L}));

        List<RepeatedViolationDto> result = dashboardService.getRepeatedViolations();

        assertEquals(List.of(new RepeatedViolationDto(42L, "demo_user3", 5L)), result);
    }

    @Test
    void summaryForRangeUsesTheBetweenQueryAndSameMapping() {
        when(screeningDecisionRepository.countByDecisionBetween(any(), any())).thenReturn(List.of(
                new Object[]{Decision.ALLOW, 2L},
                new Object[]{Decision.BLOCK, 1L}));

        DashboardSummaryDto summary = dashboardService.getSummaryForRange(LocalDate.of(2026, 1, 1), LocalDate.of(2026, 1, 31));

        assertEquals(3, summary.total());
        assertEquals(2, summary.allowed());
        assertEquals(1, summary.blocked());
    }

    @Test
    void riskDistributionForRangeMapsEachBand() {
        when(screeningDecisionRepository.countByDecisionBetween(any(), any()))
                .thenReturn(List.<Object[]>of(new Object[]{Decision.MASK, 4L}));

        List<RiskBandStatDto> distribution = dashboardService.getRiskDistributionForRange(null, null);

        assertEquals(List.of(new RiskBandStatDto("MASK", 4L)), distribution);
    }

    @Test
    void entityStatsForRangeMapsEachRow() {
        when(detectionFindingRepository.countGroupedByEntityTypeBetween(any(), any()))
                .thenReturn(List.<Object[]>of(new Object[]{EntityType.PAYMENT_CARD, 3L}));

        List<EntityStatDto> stats = dashboardService.getEntityStatsForRange(LocalDate.of(2026, 1, 1), LocalDate.of(2026, 1, 31));

        assertEquals(List.of(new EntityStatDto("PAYMENT_CARD", 3L)), stats);
    }

    private DetectionFinding finding(EntityType type) {
        DetectionFinding finding = new DetectionFinding();
        finding.setEntityType(type);
        finding.setStartPos(0);
        finding.setEndPos(5);
        finding.setConfidence(0.9);
        return finding;
    }
}
