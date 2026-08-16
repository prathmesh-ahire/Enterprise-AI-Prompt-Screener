package com.screener.dto;

public record ProcessingTimeStatsDto(
        Double averageMs,
        Long maxMs
) {
}
