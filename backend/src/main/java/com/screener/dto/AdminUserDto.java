package com.screener.dto;

import java.time.LocalDateTime;
import java.util.List;

/**
 * No password field, ever.
 */
public record AdminUserDto(
        Long id,
        String username,
        String email,
        List<String> roles,
        String accountStatus,
        LocalDateTime createdAt
) {
}
