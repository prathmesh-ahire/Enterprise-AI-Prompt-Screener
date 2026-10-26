package com.screener.service;

import com.screener.dto.ApprovedModelDto;
import com.screener.dto.DashboardSummaryDto;
import com.screener.dto.EntityStatDto;
import com.screener.dto.RiskBandStatDto;
import lombok.RequiredArgsConstructor;
import org.openpdf.text.Chunk;
import org.openpdf.text.Document;
import org.openpdf.text.DocumentException;
import org.openpdf.text.Font;
import org.openpdf.text.FontFactory;
import org.openpdf.text.Paragraph;
import org.openpdf.text.Phrase;
import org.openpdf.text.pdf.PdfPCell;
import org.openpdf.text.pdf.PdfPTable;
import org.openpdf.text.pdf.PdfWriter;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.io.UncheckedIOException;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;

/**
 * Exports the same aggregate-only figures already shown on the admin
 * dashboard as a downloadable CSV or PDF for a caller-selected date range.
 * Every value here is a count grouped by decision/entity type - no raw prompt text, no
 * per-user data - matching {@code DashboardService}'s existing privacy posture.
 */
@Service
@RequiredArgsConstructor
public class ReportService {

    private static final DateTimeFormatter TIMESTAMP_FMT = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

    private static final String LIMITATIONS_NOTICE =
            "Detection is regex/heuristic-based (email, phone, PAN, Aadhaar, payment card, API key, "
            + "password, private key, org-confidential term); it does not include NLP/NER-based person-name "
            + "detection. Risk scoring weights and band thresholds are this project's own implementation "
            + "choices, not an industry standard. Raw prompt text is retained in storage subject to the "
            + "configured retention policy, but is never returned via any API once a masked version exists. "
            + "This report reflects a single local AI model deployment; no third-party model calls are made.";

    private final DashboardService dashboardService;
    private final AdminService adminService;

    
    public byte[] exportCsv(LocalDate from, LocalDate to) {
        ReportData data = buildReportData(from, to);
        StringBuilder csv = new StringBuilder();

        csv.append("Enterprise Prompt Screener - Report\n");
        appendCsvRow(csv, "Period", data.from() + " to " + data.to());
        appendCsvRow(csv, "Generated At", data.generatedAt().format(TIMESTAMP_FMT));
        csv.append('\n');

        csv.append("Summary\n");
        appendCsvRow(csv, "Metric", "Count");
        appendCsvRow(csv, "Total", String.valueOf(data.summary().total()));
        appendCsvRow(csv, "Allowed", String.valueOf(data.summary().allowed()));
        appendCsvRow(csv, "Masked", String.valueOf(data.summary().masked()));
        appendCsvRow(csv, "Confirm", String.valueOf(data.summary().confirm()));
        appendCsvRow(csv, "Blocked", String.valueOf(data.summary().blocked()));
        appendCsvRow(csv, "Pending Review", String.valueOf(data.summary().pendingReview()));
        csv.append('\n');

        csv.append("Risk Band Distribution\n");
        appendCsvRow(csv, "Risk Band", "Count");
        for (RiskBandStatDto row : data.riskDistribution()) {
            appendCsvRow(csv, row.riskBand(), String.valueOf(row.count()));
        }
        csv.append('\n');

        csv.append("Detection Entity Stats\n");
        appendCsvRow(csv, "Entity Type", "Count");
        for (EntityStatDto row : data.entityStats()) {
            appendCsvRow(csv, row.entityType(), String.valueOf(row.count()));
        }

        return csv.toString().getBytes(StandardCharsets.UTF_8);
    }

    
    public byte[] exportPdf(LocalDate from, LocalDate to) {
        ReportData data = buildReportData(from, to);
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        Document document = new Document();
        try {
            PdfWriter.getInstance(document, out);
            document.open();

            Font titleFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 16);
            Font headingFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 12);
            Font bodyFont = FontFactory.getFont(FontFactory.HELVETICA, 10);

            document.add(new Paragraph("Enterprise Prompt Screener - Report", titleFont));
            document.add(new Paragraph("Period: " + data.from() + " to " + data.to(), bodyFont));
            document.add(new Paragraph("Generated At: " + data.generatedAt().format(TIMESTAMP_FMT), bodyFont));
            document.add(new Paragraph("Active Policy Version: " + data.policyVersion(), bodyFont));
            document.add(new Paragraph("Active Model: " + data.activeModelName(), bodyFont));
            document.add(Chunk.NEWLINE);

            document.add(new Paragraph("Summary", headingFont));
            document.add(twoColumnTable(List.of("Metric", "Count"), List.of(
                    List.of("Total", String.valueOf(data.summary().total())),
                    List.of("Allowed", String.valueOf(data.summary().allowed())),
                    List.of("Masked", String.valueOf(data.summary().masked())),
                    List.of("Confirm", String.valueOf(data.summary().confirm())),
                    List.of("Blocked", String.valueOf(data.summary().blocked())),
                    List.of("Pending Review", String.valueOf(data.summary().pendingReview())))));
            document.add(Chunk.NEWLINE);

            document.add(new Paragraph("Risk Band Distribution", headingFont));
            document.add(twoColumnTable(List.of("Risk Band", "Count"),
                    data.riskDistribution().stream().map(r -> List.of(r.riskBand(), String.valueOf(r.count()))).toList()));
            document.add(Chunk.NEWLINE);

            document.add(new Paragraph("Detection Entity Stats", headingFont));
            document.add(twoColumnTable(List.of("Entity Type", "Count"),
                    data.entityStats().stream().map(r -> List.of(r.entityType(), String.valueOf(r.count()))).toList()));
            document.add(Chunk.NEWLINE);

            document.add(new Paragraph("Limitations", headingFont));
            document.add(new Paragraph(LIMITATIONS_NOTICE, bodyFont));

            document.close();
            return out.toByteArray();
        } catch (DocumentException e) {
            throw new UncheckedIOException(new java.io.IOException("Failed to generate PDF report", e));
        }
    }

    private ReportData buildReportData(LocalDate from, LocalDate to) {
        LocalDate rangeFrom = from != null ? from : LocalDate.now().minusDays(7);
        LocalDate rangeTo = to != null ? to : LocalDate.now();

        DashboardSummaryDto summary = dashboardService.getSummaryForRange(from, to);
        List<RiskBandStatDto> riskDistribution = dashboardService.getRiskDistributionForRange(from, to);
        List<EntityStatDto> entityStats = dashboardService.getEntityStatsForRange(from, to);
        int policyVersion = adminService.getPolicy().policyVersion();
        String activeModel = adminService.getApprovedModels().stream()
                .filter(ApprovedModelDto::active)
                .map(ApprovedModelDto::modelName)
                .findFirst()
                .orElse("none configured");

        return new ReportData(rangeFrom, rangeTo, LocalDateTime.now(), summary, riskDistribution, entityStats,
                policyVersion, activeModel);
    }

    private PdfPTable twoColumnTable(List<String> headers, List<List<String>> rows) {
        Font headerFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 10);
        Font cellFont = FontFactory.getFont(FontFactory.HELVETICA, 10);

        PdfPTable table = new PdfPTable(headers.size());
        table.setWidthPercentage(100);
        for (String header : headers) {
            table.addCell(new PdfPCell(new Phrase(header, headerFont)));
        }
        for (List<String> row : rows) {
            for (String value : row) {
                table.addCell(new PdfPCell(new Phrase(value, cellFont)));
            }
        }
        if (rows.isEmpty()) {
            PdfPCell empty = new PdfPCell(new Phrase("No data for this period", cellFont));
            empty.setColspan(headers.size());
            table.addCell(empty);
        }
        return table;
    }

    private void appendCsvRow(StringBuilder sb, String first, String second) {
        sb.append(csvField(first)).append(',').append(csvField(second)).append('\n');
    }

    private String csvField(String value) {
        if (value == null) {
            return "";
        }
        if (value.contains(",") || value.contains("\"") || value.contains("\n")) {
            return "\"" + value.replace("\"", "\"\"") + "\"";
        }
        return value;
    }

    private record ReportData(
            LocalDate from,
            LocalDate to,
            LocalDateTime generatedAt,
            DashboardSummaryDto summary,
            List<RiskBandStatDto> riskDistribution,
            List<EntityStatDto> entityStats,
            int policyVersion,
            String activeModelName) {
    }
}
