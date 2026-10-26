package com.screener.service;

import com.screener.detection.DetectionEngine;
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
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Backs {@code /api/dashboard/**}. Every query is an aggregate
 * {@code @Query}/derived-count query — none of these methods load full result sets
 * into memory to compute a count.
 */
@Service
@RequiredArgsConstructor
public class DashboardService {

    // Matches RiskAnalysisEngine's own REPEATED_ATTACK_PATTERN threshold.
    private static final long REPEATED_VIOLATION_MIN_COUNT = 3;
    private static final List<String> VIOLATION_ACTIONS = List.of("BLOCK", "REVIEW");
    private static final int LOOKBACK_DAYS = 7;

    private final ScreeningDecisionRepository screeningDecisionRepository;
    private final DetectionFindingRepository detectionFindingRepository;
    private final AuditEventRepository auditEventRepository;

    
    public DashboardSummaryDto getSummary() {
        LocalDateTime startOfToday = LocalDate.now().atStartOfDay();
        return toSummary(screeningDecisionRepository.countByDecisionSince(startOfToday));
    }

    
    public List<EntityStatDto> getEntityStats() {
        return detectionFindingRepository.countGroupedByEntityType().stream()
                .map(row -> new EntityStatDto(((EntityType) row[0]).name(), (Long) row[1]))
                .toList();
    }

    
    public List<RiskBandStatDto> getRiskDistribution() {
        LocalDateTime since = LocalDateTime.now().minusDays(LOOKBACK_DAYS);
        return screeningDecisionRepository.countByDecisionSince(since).stream()
                .map(row -> new RiskBandStatDto(((Decision) row[0]).name(), (Long) row[1]))
                .toList();
    }

    
    public List<RecentBlockedDto> getRecentBlocked() {
        return screeningDecisionRepository.findTop10ByDecisionOrderByTimestampDesc(Decision.BLOCK).stream()
                .map(this::toRecentBlockedDto)
                .toList();
    }

    // defaults to the last 7 days when the caller doesn't select a period.
    public ProcessingTimeStatsDto getProcessingTimeStats(LocalDate from, LocalDate to) {
        Object[] row = screeningDecisionRepository.processingTimeStatsBetween(rangeStart(from), rangeEnd(to)).get(0);
        Double average = row[0] != null ? ((Number) row[0]).doubleValue() : null;
        Long max = row[1] != null ? ((Number) row[1]).longValue() : null;
        return new ProcessingTimeStatsDto(average, max);
    }

    // Report-export variants of the summary, entity-stats and risk-distribution queries, bounded to a
    // caller-selected date range (rather than "today"/"last 7 days") - same defaulting convention as above.
    public DashboardSummaryDto getSummaryForRange(LocalDate from, LocalDate to) {
        return toSummary(screeningDecisionRepository.countByDecisionBetween(rangeStart(from), rangeEnd(to)));
    }

    public List<RiskBandStatDto> getRiskDistributionForRange(LocalDate from, LocalDate to) {
        return screeningDecisionRepository.countByDecisionBetween(rangeStart(from), rangeEnd(to)).stream()
                .map(row -> new RiskBandStatDto(((Decision) row[0]).name(), (Long) row[1]))
                .toList();
    }

    public List<EntityStatDto> getEntityStatsForRange(LocalDate from, LocalDate to) {
        return detectionFindingRepository.countGroupedByEntityTypeBetween(rangeStart(from), rangeEnd(to)).stream()
                .map(row -> new EntityStatDto(((EntityType) row[0]).name(), (Long) row[1]))
                .toList();
    }

    private LocalDateTime rangeStart(LocalDate from) {
        return (from != null ? from : LocalDate.now().minusDays(LOOKBACK_DAYS)).atStartOfDay();
    }

    private LocalDateTime rangeEnd(LocalDate to) {
        return (to != null ? to : LocalDate.now()).atTime(LocalTime.MAX);
    }

    
    public List<RepeatedViolationDto> getRepeatedViolations() {
        LocalDateTime since = LocalDateTime.now().minusDays(LOOKBACK_DAYS);
        return auditEventRepository.findUserIdsWithActionCountAtLeast(VIOLATION_ACTIONS, since, REPEATED_VIOLATION_MIN_COUNT)
                .stream()
                .map(row -> new RepeatedViolationDto((Long) row[0], (String) row[1], (Long) row[2]))
                .toList();
    }

    private DashboardSummaryDto toSummary(List<Object[]> rows) {
        Map<Decision, Long> counts = rows.stream()
                .collect(Collectors.toMap(row -> (Decision) row[0], row -> (Long) row[1]));
        long total = counts.values().stream().mapToLong(Long::longValue).sum();
        return new DashboardSummaryDto(
                total,
                counts.getOrDefault(Decision.ALLOW, 0L),
                counts.getOrDefault(Decision.MASK, 0L),
                counts.getOrDefault(Decision.CONFIRM, 0L),
                counts.getOrDefault(Decision.BLOCK, 0L),
                counts.getOrDefault(Decision.REVIEW, 0L));
    }

    // picks the single most severe finding (DetectionEngine's own severity order)
    // as "the" trigger when a blocked request has more than one; null if the request was
    // blocked purely by score/signal with no PII/secret finding at all.
    private RecentBlockedDto toRecentBlockedDto(ScreeningDecision decision) {
        String triggeringEntityType = detectionFindingRepository.findByRequestId(decision.getRequestId()).stream()
                .map(DetectionFinding::getEntityType)
                .min(Comparator.comparingInt(DetectionEngine.SEVERITY_ORDER::indexOf))
                .map(Enum::name)
                .orElse(null);
        return new RecentBlockedDto(decision.getRequestId(), decision.getTimestamp(), decision.getRiskScore(), triggeringEntityType);
    }
}
