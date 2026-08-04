package com.screener.service;

import com.screener.dto.AdminPolicyDto;
import com.screener.dto.ApprovedModelDto;
import com.screener.dto.DashboardSummaryDto;
import com.screener.dto.EntityStatDto;
import com.screener.dto.RiskBandStatDto;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ReportServiceTest {

    @Mock private DashboardService dashboardService;
    @Mock private AdminService adminService;

    private ReportService reportService;

    @BeforeEach
    void setUp() {
        reportService = new ReportService(dashboardService, adminService);

        when(dashboardService.getSummaryForRange(any(), any()))
                .thenReturn(new DashboardSummaryDto(10, 6, 2, 1, 1));
        when(dashboardService.getRiskDistributionForRange(any(), any()))
                .thenReturn(List.of(new RiskBandStatDto("ALLOW", 6L), new RiskBandStatDto("BLOCK", 1L)));
        when(dashboardService.getEntityStatsForRange(any(), any()))
                .thenReturn(List.of(new EntityStatDto("PERSONAL_EMAIL", 3L)));
        when(adminService.getPolicy())
                .thenReturn(new AdminPolicyDto(2000, List.of(), 25, 50, 65, 75, 4));
        when(adminService.getApprovedModels())
                .thenReturn(List.of(new ApprovedModelDto(1L, "llama3.2", true, LocalDateTime.now())));
    }

    @Test
    void csvContainsAggregateFiguresAndNoRawText() {
        String csv = new String(reportService.exportCsv(LocalDate.of(2026, 1, 1), LocalDate.of(2026, 1, 31)), StandardCharsets.UTF_8);

        assertTrue(csv.contains("Summary"));
        assertTrue(csv.contains("Total,10"));
        assertTrue(csv.contains("Allowed,6"));
        assertTrue(csv.contains("Blocked,1"));
        assertTrue(csv.contains("PERSONAL_EMAIL,3"));
        assertTrue(csv.contains("ALLOW,6"));
        // aggregate/category data only - never a raw email/phone/etc value.
        assertFalse(csv.contains("@"));
    }

    @Test
    void pdfIsAValidNonEmptyPdfDocument() {
        byte[] pdf = reportService.exportPdf(null, null);

        assertTrue(pdf.length > 0);
        String header = new String(pdf, 0, 4, StandardCharsets.US_ASCII);
        assertEquals("%PDF", header);
    }
}
