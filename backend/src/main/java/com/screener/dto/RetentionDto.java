package com.screener.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

public record RetentionDto(
        @NotNull @Min(1) Integer retentionDays
) {
}
