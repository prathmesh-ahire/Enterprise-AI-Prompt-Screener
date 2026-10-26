package com.screener.controller;

import com.screener.dto.DashboardSummaryDto;
import com.screener.dto.EntityStatDto;
import com.screener.dto.ProcessingTimeStatsDto;
import com.screener.dto.RecentBlockedDto;
import com.screener.dto.RepeatedViolationDto;
import com.screener.dto.RiskBandStatDto;
import com.screener.service.DashboardService;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.List;

/**
 * The entity-stats and risk-distribution endpoints name no role of their own — given they're
 * plain aggregate counts with no user-identifying info, same sensitivity as the
 * summary, they get the same ADMIN+REVIEWER access rather than defaulting to ADMIN-only.
 */
@RestController
@RequestMapping("/api/dashboard")
@RequiredArgsConstructor
public class DashboardController {

    private final DashboardService dashboardService;

    @GetMapping("/summary")
    @PreAuthorize("hasAnyRole('ADMIN','REVIEWER')")
    public ResponseEntity<DashboardSummaryDto> summary() {
        return ResponseEntity.ok(dashboardService.getSummary());
    }

    @GetMapping("/entity-stats")
    @PreAuthorize("hasAnyRole('ADMIN','REVIEWER')")
    public ResponseEntity<List<EntityStatDto>> entityStats() {
        return ResponseEntity.ok(dashboardService.getEntityStats());
    }

    @GetMapping("/risk-distribution")
    @PreAuthorize("hasAnyRole('ADMIN','REVIEWER')")
    public ResponseEntity<List<RiskBandStatDto>> riskDistribution() {
        return ResponseEntity.ok(dashboardService.getRiskDistribution());
    }

    @GetMapping("/recent-blocked")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<RecentBlockedDto>> recentBlocked() {
        return ResponseEntity.ok(dashboardService.getRecentBlocked());
    }

    @GetMapping("/processing-time")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ProcessingTimeStatsDto> processingTime(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        return ResponseEntity.ok(dashboardService.getProcessingTimeStats(from, to));
    }

    @GetMapping("/repeated-violations")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<RepeatedViolationDto>> repeatedViolations() {
        return ResponseEntity.ok(dashboardService.getRepeatedViolations());
    }
}
