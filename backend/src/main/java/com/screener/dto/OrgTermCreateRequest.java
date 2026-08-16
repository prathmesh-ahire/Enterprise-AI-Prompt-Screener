package com.screener.dto;

import jakarta.validation.constraints.NotBlank;

public record OrgTermCreateRequest(
        @NotBlank(message = "term is required")
        String term
) {
}
