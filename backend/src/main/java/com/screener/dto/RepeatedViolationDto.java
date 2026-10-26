package com.screener.dto;

/**
 * A user with repeated BLOCK/REVIEW decisions in the lookback window.
 *
 * <p>{@code username} is a later addition. {@code userId} is kept because the panel's
 * "View history" link needs it to call {@code /api/admin/users/{id}/history}.
 */
public record RepeatedViolationDto(
        Long userId,
        String username,
        long violationCount
) {
}
