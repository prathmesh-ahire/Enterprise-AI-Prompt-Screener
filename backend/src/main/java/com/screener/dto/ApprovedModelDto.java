package com.screener.dto;

import java.time.LocalDateTime;

public record ApprovedModelDto(
        Long id,
        String modelName,
        boolean active,
        LocalDateTime addedAt
) {
}
