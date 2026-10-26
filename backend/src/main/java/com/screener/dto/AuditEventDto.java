package com.screener.dto;

import java.time.LocalDateTime;
import java.util.UUID;

// Carries username, for the admin audit log. userId is kept: additive only.
// Null when the event has no user or the user no longer exists.
public record AuditEventDto(
        Long id,
        Long userId,
        String username,
        String action,
        UUID requestId,
        String riskBand,
        LocalDateTime createdAt
) {
}
