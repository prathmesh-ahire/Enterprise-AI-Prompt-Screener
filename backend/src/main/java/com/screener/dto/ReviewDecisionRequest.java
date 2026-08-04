package com.screener.dto;

import com.screener.model.ReviewAction;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record ReviewDecisionRequest(
        @NotNull(message = "action is required")
        ReviewAction action,

        @NotBlank(message = "reason is required")
        String reason
) {
}
