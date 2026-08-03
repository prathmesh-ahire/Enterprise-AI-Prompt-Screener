package com.screener.dto;

import java.util.UUID;

public record PromptResponseDto(
        UUID requestId,
        String status,
        String decision,
        String explanation,
        String maskedText,
        String aiResponse
) {
}
