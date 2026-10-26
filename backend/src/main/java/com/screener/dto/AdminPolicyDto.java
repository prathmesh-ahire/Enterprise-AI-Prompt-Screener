package com.screener.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

import java.util.List;

/**
 * Active thresholds, which detectors are enabled (mirrored here as
 * the disabled set, same representation {@code DetectionEngine} stores), max prompt
 * length. Same shape for both GET's response and PUT's request body; {@code policyVersion}
 * is ignored on PUT (server-incremented) and only meaningful on the GET response.
 */
public record AdminPolicyDto(
        @NotNull @Min(1) Integer maxPromptLength,
        List<String> disabledDetectors,
        @NotNull @Min(0) Integer maskThreshold,
        @NotNull @Min(0) Integer confirmThreshold,
        @NotNull @Min(0) Integer reviewThreshold,
        @NotNull @Min(0) Integer blockThreshold,
        Integer policyVersion
) {
}
