package com.screener.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record PromptRequestDto(
        @NotBlank(message = "Prompt text is required")
        @Size(min = 3, message = "Prompt text must be at least 3 characters")
        String text
) {
}
