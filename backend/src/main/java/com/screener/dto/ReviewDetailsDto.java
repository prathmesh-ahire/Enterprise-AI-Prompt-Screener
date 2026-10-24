package com.screener.dto;

import java.util.List;
import java.util.UUID;

/**
 * todo.md Phase 18.5. {@code maskedPrompt} is never the raw prompt text when a masked
 * version exists (18.4) — see {@code ReviewService.reviewerVisibleText} for the one
 * documented exception (no findings at all to mask in the first place).
 */
public record ReviewDetailsDto(
        UUID requestId,
        String maskedPrompt,
        List<String> entityTypes,
        Double riskScore,
        List<String> matchedSignals,
        String explanation,
        // V2 55.5: why it reached the queue - usually the injection override, not the score.
        // Null for prompts screened before V2.
        ScoreBreakdownDto scoreBreakdown
) {
}
