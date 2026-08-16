package com.screener.dto;

import jakarta.validation.constraints.NotNull;

public record ApprovedModelUpdateRequest(
        @NotNull(message = "active is required")
        Boolean active
) {
}
