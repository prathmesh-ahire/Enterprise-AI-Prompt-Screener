package com.screener.dto;

import java.time.LocalDateTime;
import java.util.UUID;

public record AuditEventDto(
        Long id,
        Long userId,
        String action,
        UUID requestId,
        String riskBand,
        LocalDateTime createdAt
) {
}
