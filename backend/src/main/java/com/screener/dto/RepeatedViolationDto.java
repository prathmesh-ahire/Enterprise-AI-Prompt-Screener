package com.screener.dto;

public record RepeatedViolationDto(
        Long userId,
        long violationCount
) {
}
