package com.screener.dto;

import java.util.List;
import java.util.UUID;

// Phase 27.3/27.4 added riskScore/entityTypes - the frontend prompt-result screen needs
// both for the risk-score progress bar and the entity-type chips, mirroring the same two
// fields ReviewDetailsDto (Phase 18.5) already exposes to the reviewer view.
public record PromptResponseDto(
        UUID requestId,
        String status,
        String decision,
        String explanation,
        String maskedText,
        String aiResponse,
        Double riskScore,
        List<String> entityTypes,
        // V2 55.4: null for prompts screened before V2 (no breakdown was recorded).
        ScoreBreakdownDto scoreBreakdown
) {
}
