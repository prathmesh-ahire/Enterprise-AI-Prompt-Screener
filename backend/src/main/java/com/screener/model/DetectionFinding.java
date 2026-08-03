package com.screener.model;

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

import java.util.UUID;

@Entity
@Table(name = "detection_findings")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class DetectionFinding {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private UUID requestId;

    @Enumerated(EnumType.STRING)
    private EntityType entityType;

    private Integer startPos;

    private Integer endPos;

    private Double confidence;
}
