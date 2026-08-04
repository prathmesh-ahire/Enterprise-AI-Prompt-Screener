package com.screener.controller;

import com.screener.service.ReportService;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;

/**
 * todo.md Phase 22 - dashboard-equivalent aggregate report, downloadable as CSV or PDF for
 * a caller-selected date range. ADMIN-only, same as the dashboard's own recent-blocked/
 * processing-time/repeated-violations routes (Phase 21).
 */
@RestController
@RequestMapping("/api/reports")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class ReportController {

    private final ReportService reportService;

    @GetMapping("/export")
    public ResponseEntity<byte[]> export(
            @RequestParam String format,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        byte[] body;
        MediaType contentType;
        String filename;

        switch (format.toLowerCase()) {
            case "csv" -> {
                body = reportService.exportCsv(from, to);
                contentType = MediaType.parseMediaType("text/csv");
                filename = "screening-report.csv";
            }
            case "pdf" -> {
                body = reportService.exportPdf(from, to);
                contentType = MediaType.APPLICATION_PDF;
                filename = "screening-report.pdf";
            }
            default -> throw new IllegalArgumentException("format must be 'csv' or 'pdf'");
        }

        return ResponseEntity.ok()
                .contentType(contentType)
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        ContentDisposition.attachment().filename(filename).build().toString())
                .body(body);
    }
}
