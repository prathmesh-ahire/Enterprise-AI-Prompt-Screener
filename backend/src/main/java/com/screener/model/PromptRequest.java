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
@Table(name = "prompt_requests", indexes = {
        @Index(name = "idx_prompt_requests_request_id", columnList = "request_id"),
        @Index(name = "idx_prompt_requests_user_id", columnList = "user_id"),
        @Index(name = "idx_prompt_requests_status", columnList = "status"),
        @Index(name = "idx_prompt_requests_submitted_at", columnList = "submitted_at")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class PromptRequest {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private UUID requestId;

    private Long userId;

    @Column(columnDefinition = "TEXT")
    private String promptText;

    private String promptHash;

    @Column(columnDefinition = "TEXT")
    private String maskedText;

    @Column(columnDefinition = "TEXT")
    private String aiResponse;

    @Enumerated(EnumType.STRING)
    private PromptStatus status;

    private LocalDateTime submittedAt;

    private LocalDateTime completedAt;
}
