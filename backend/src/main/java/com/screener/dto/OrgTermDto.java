package com.screener.dto;

public record OrgTermDto(
        Long id,
        String term,
        Long addedBy,
        boolean active
) {
}
