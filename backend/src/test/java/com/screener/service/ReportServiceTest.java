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
                // 41.6: (total, allowed, masked, confirm, blocked, pendingReview) - the
                // categories deliberately sum to the total so the report's own arithmetic
                // is exercised: 6+2+1+... see summaryCategoriesSumToTotal below.
                .thenReturn(new DashboardSummaryDto(10, 5, 2, 1, 1, 1));
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
        assertTrue(csv.contains("Allowed,5"));
        assertTrue(csv.contains("Blocked,1"));
        assertTrue(csv.contains("PERSONAL_EMAIL,3"));
        assertTrue(csv.contains("ALLOW,6"));
        // aggregate/category data only - never a raw email/phone/etc value.
        assertFalse(csv.contains("@"));
    }

    // 41.6: the Summary block used to omit CONFIRM entirely while Total counted it, so the
    // categories an examiner can add up did not reach the total printed above them. Asserts
    // the row exists and that the five categories reconcile against Total.
    @Test
    void summaryCategoriesSumToTotal() {
        String csv = new String(reportService.exportCsv(null, null), StandardCharsets.UTF_8);

        assertTrue(csv.contains("Confirm,1"));

        long total = csvValue(csv, "Total");
        long categories = csvValue(csv, "Allowed") + csvValue(csv, "Masked") + csvValue(csv, "Confirm")
                + csvValue(csv, "Blocked") + csvValue(csv, "Pending Review");
        assertEquals(total, categories);
    }

    private long csvValue(String csv, String label) {
        return csv.lines()
                .filter(line -> line.startsWith(label + ","))
                .findFirst()
                .map(line -> Long.parseLong(line.substring(label.length() + 1).trim()))
                .orElseThrow(() -> new AssertionError("No CSV row labelled " + label));
    }

    @Test
    void pdfIsAValidNonEmptyPdfDocument() {
        byte[] pdf = reportService.exportPdf(null, null);

        assertTrue(pdf.length > 0);
        String header = new String(pdf, 0, 4, StandardCharsets.US_ASCII);
        assertEquals("%PDF", header);
    }
}
