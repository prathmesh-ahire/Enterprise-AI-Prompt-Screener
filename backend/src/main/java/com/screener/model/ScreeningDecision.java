package com.screener.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "screening_decisions")
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
}
