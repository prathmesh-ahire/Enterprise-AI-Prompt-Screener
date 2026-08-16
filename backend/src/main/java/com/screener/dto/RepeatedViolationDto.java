package com.screener.dto;

/**
 * todo.md Phase 21.6 — a user with repeated BLOCK/REVIEW decisions in the lookback window.
 *
 * <p>Phase 41.7 added {@code username}. {@code userId} is kept because the panel's
 * "View history" link needs it to call {@code /api/admin/users/{id}/history}.
 */
public record RepeatedViolationDto(
        Long userId,
        String username,
        long violationCount
) {
}
