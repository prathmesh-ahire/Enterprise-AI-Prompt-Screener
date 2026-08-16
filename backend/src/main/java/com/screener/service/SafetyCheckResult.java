package com.screener.service;

/**
 * Output of {@link ResponseSafetyChecker} (todo.md 16.1). When {@code safe} is false,
 * {@code responseText} is the canned withheld-response message (16.4), not the original
 * AI reply — callers should always show {@code responseText} as-is, never branch on
 * {@code safe} to decide what to display.
 */
public record SafetyCheckResult(boolean safe, String responseText) {
}
