package com.screener.config;

import com.screener.model.EntityType;
import org.junit.jupiter.api.Test;

import java.util.Set;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * a malformed {@code system_config} row must degrade to the documented
 * default rather than throwing, because these values are read inside the prompt-screening
 * hot path: one bad row used to break every submission that followed it, not just the
 * feature that owned the setting.
 */
class SystemConfigValuesTest {

    @Test
    void parsesAWellFormedNumber() {
        assertEquals(2000, SystemConfigValues.parseInt("max_prompt_length", "2000", 500));
    }

    @Test
    void toleratesSurroundingWhitespace() {
        assertEquals(75, SystemConfigValues.parseInt("risk_threshold_block", "  75 ", 10));
    }

    @Test
    void fallsBackToTheDefaultOnANonNumericValue() {
        assertEquals(500, SystemConfigValues.parseInt("max_prompt_length", "two thousand", 500));
    }

    @Test
    void fallsBackToTheDefaultOnAnEmptyOrNullValue() {
        assertEquals(25, SystemConfigValues.parseInt("risk_threshold_mask", "", 25));
        assertEquals(25, SystemConfigValues.parseInt("risk_threshold_mask", null, 25));
    }

    @Test
    void parsesACommaSeparatedDetectorList() {
        Set<EntityType> parsed = SystemConfigValues.parseEntityTypes(
                "disabled_detectors", "PERSONAL_EMAIL, PHONE_NUMBER");

        assertEquals(Set.of(EntityType.PERSONAL_EMAIL, EntityType.PHONE_NUMBER), parsed);
    }

    // The important one: a typo must cost one disabled detector, never the whole pipeline.
    @Test
    void skipsAnUnknownDetectorNameAndKeepsTheValidOnes() {
        Set<EntityType> parsed = SystemConfigValues.parseEntityTypes(
                "disabled_detectors", "PERSONAL_EMAIL, NOT_A_REAL_DETECTOR, PHONE_NUMBER");

        assertEquals(Set.of(EntityType.PERSONAL_EMAIL, EntityType.PHONE_NUMBER), parsed);
    }

    @Test
    void returnsEmptyWhenEveryNameIsUnknown() {
        assertTrue(SystemConfigValues.parseEntityTypes("disabled_detectors", "NOPE, ALSO_NOPE").isEmpty());
    }
}
