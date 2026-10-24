package com.screener.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "screening_decisions", indexes = {
        @Index(name = "idx_screening_decisions_request_id", columnList = "request_id"),
        @Index(name = "idx_screening_decisions_timestamp", columnList = "timestamp")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class ScreeningDecision {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private UUID requestId;

    @Enumerated(EnumType.STRING)
    private Decision decision;

    private Double riskScore;

    @Column(columnDefinition = "TEXT")
    private String explanation;

    private Integer policyVersion;

    private LocalDateTime timestamp;

    private Long processingTimeMs;

    // V2 Phase 55.3 - the score breakdown. Every column is nullable: rows screened before V2
    // have none of it, and null means "not recorded", never zero. Never back-filled - a
    // re-screen today would use today's thresholds and history, not the ones that decided.
    private Double sensitiveDataScore;

    private Double injectionScore;

    private Double secretCriticalityScore;

    private Double policyContextScore;

    private Double obfuscationScore;

    // The band the score alone gave, before any hard override.
    @Enumerated(EnumType.STRING)
    private Decision scoreBand;

    // OverrideRule names that raised the decision, comma-separated in rule order.
    // "" means none applied; null means not recorded.
    private String appliedOverrides;
}
