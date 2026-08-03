package com.screener.model;

import jakarta.persistence.Entity;
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
@Table(name = "audit_events")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class AuditEvent {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long userId;

    // Free-form action label (e.g. "LOGIN", "BLOCK", "REVIEW") — kept as a plain
    // string since the full vocabulary isn't finalised until Phase 17 wires up
    // AuditService; the exact literals "BLOCK"/"REVIEW" are load-bearing for the
    // Phase 10.8 repeated-attack-pattern query.
    private String action;

    private UUID requestId;

    private String riskBand;

    private LocalDateTime createdAt;
}
