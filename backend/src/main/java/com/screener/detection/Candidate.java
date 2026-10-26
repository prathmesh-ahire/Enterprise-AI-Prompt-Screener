package com.screener.detection;

/**
 * A raw pass-1 match before pass-2 validation. {@code value} is held only in memory
 * for the duration of detection — never persisted or logged (security rules).
 */
public record Candidate(int start, int end, String value) {
}
