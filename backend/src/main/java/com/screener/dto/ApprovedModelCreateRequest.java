package com.screener.dto;

import jakarta.validation.constraints.NotBlank;

public record ApprovedModelCreateRequest(
        @NotBlank(message = "modelName is required")
        String modelName
) {
}
