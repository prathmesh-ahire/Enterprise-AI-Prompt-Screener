package com.screener.config;

import com.screener.model.EntityType;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.Arrays;
import java.util.LinkedHashSet;
import java.util.Set;

/**
 * Fault-tolerant readers for {@code system_config} values.
 *
 * <p>Every config value in this project is read fresh on each use, straight into
 * {@code Integer.parseInt} or {@code EntityType.valueOf}. Both throw on bad input, and
 * these reads sit in the prompt-screening hot path — so a single malformed row (a typo'd
 * detector name, a non-numeric threshold) took down <em>every subsequent prompt
 * submission</em>, not just the feature that owned the setting.
 *
 * <p>{@code AdminService} validates both shapes on write, so this is only reachable by
 * editing the table directly in MySQL — which is a realistic thing to do while debugging a
 * demo, and exactly when a hard failure is least welcome. Degrading to the documented
 * default and logging one WARN keeps screening running; the admin UI still refuses to
 * <em>write</em> a bad value, so this is a safety net rather than a relaxation.
 *
 * <p>The WARN names the offending key but never its value, matching the project's
 * privacy-aware logging rule.
 */
public final class SystemConfigValues {

    private static final Logger log = LoggerFactory.getLogger(SystemConfigValues.class);

    private SystemConfigValues() {
    }

    /** Parses a whole-number config value, falling back to {@code defaultValue} if it is not one. */
    public static int parseInt(String key, String rawValue, int defaultValue) {
        try {
            return Integer.parseInt(rawValue.trim());
        } catch (NumberFormatException | NullPointerException ex) {
            log.warn("system_config key '{}' is not a valid whole number - falling back to default {}. "
                    + "Fix it via the admin policy page rather than editing the table directly.", key, defaultValue);
            return defaultValue;
        }
    }

    /**
     * Parses a comma-separated list of {@link EntityType} names, skipping any entry that is
     * not a real detector rather than rejecting the whole list. A typo in one name therefore
     * disables one fewer detector than intended — it never stops detection running at all.
     */
    public static Set<EntityType> parseEntityTypes(String key, String rawValue) {
        Set<EntityType> parsed = new LinkedHashSet<>();
        Arrays.stream(rawValue.split(","))
                .map(String::trim)
                .filter(name -> !name.isEmpty())
                .forEach(name -> {
                    try {
                        parsed.add(EntityType.valueOf(name));
                    } catch (IllegalArgumentException ex) {
                        log.warn("system_config key '{}' names an unknown detector - ignoring that entry. "
                                + "Manage detectors via the admin policy page rather than editing the table directly.", key);
                    }
                });
        return parsed;
    }
}
