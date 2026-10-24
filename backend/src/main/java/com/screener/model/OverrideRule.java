package com.screener.model;

/**
 * V2 Phase 55.1 - the three hard override rules in {@code PolicyDecisionEngine}, as
 * persisted identifiers. Each carries the decision floor it enforces and a fixed,
 * plain-English description the UI can show. The description is about the rule, never
 * about the prompt, so it is safe to return to any caller.
 *
 * <p>Declared in the order the engine applies them. Persisted by name
 * ({@code screening_decisions.applied_overrides}), so a constant must never be renamed.
 */
public enum OverrideRule {
    CRITICAL_SECRET(Decision.BLOCK,
            "A private key or API key was detected, so the prompt is always blocked."),
    INJECTION_SIGNAL(Decision.REVIEW,
            "An instruction-override or policy-bypass attempt was detected, so the prompt always goes to human review."),
    DETECTED_ENTITY(Decision.MASK,
            "Sensitive data was detected, so the prompt is always masked at minimum.");

    private final Decision floor;
    private final String description;

    OverrideRule(Decision floor, String description) {
        this.floor = floor;
        this.description = description;
    }

    public Decision floor() {
        return floor;
    }

    public String description() {
        return description;
    }
}
