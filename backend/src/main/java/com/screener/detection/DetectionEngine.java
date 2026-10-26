package com.screener.detection;

import com.screener.config.SystemConfigValues;
import com.screener.model.DetectionFinding;
import com.screener.model.EntityType;
import com.screener.model.SystemConfig;
import com.screener.repository.SystemConfigRepository;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Set;

/**
 * Runs every registered {@link Detector} bean and returns the merged, overlap-resolved
 * findings. Skips detectors named in the {@code disabled_detectors} system_config row
 * (comma-separated {@link EntityType} names, all enabled if the row is missing/blank) —
 * this is what makes the admin's per-detector toggle actually do
 * something. Adding a new {@link Detector} bean requires
 * no change here — Spring collects them into {@code detectors} automatically.
 */
@Component
@RequiredArgsConstructor
public class DetectionEngine {

    private static final Logger log = LoggerFactory.getLogger(DetectionEngine.class);

    // Public: AdminService reads/writes this same key.
    public static final String DISABLED_DETECTORS_CONFIG_KEY = "disabled_detectors";

    // Priority order for tie-breaking overlapping findings of equal confidence — most
    // severe first, so e.g. PRIVATE_KEY always wins over a lower-severity overlap.
    // Public: DashboardService reuses this same ordering to pick a single
    // "triggering" entity type when a blocked request has more than one finding.
    public static final List<EntityType> SEVERITY_ORDER = List.of(
            EntityType.PRIVATE_KEY,
            EntityType.API_KEY,
            EntityType.PASSWORD_SECRET,
            EntityType.PAYMENT_CARD,
            EntityType.AADHAAR_LIKE_ID,
            EntityType.PAN_LIKE_ID,
            EntityType.ORG_CONFIDENTIAL,
            EntityType.PHONE_NUMBER,
            EntityType.PERSONAL_EMAIL
    );

    private final List<Detector> detectors;
    private final SystemConfigRepository systemConfigRepository;

    /**
     * Reads the disabled-detector set itself. Kept for callers that screen a one-off piece of
     * text outside a prompt submission (e.g. {@code ResponseSafetyChecker}) and for tests.
     */
    public List<DetectionFinding> detectAll(String text) {
        return detectAll(text, loadDisabledDetectors());
    }

    // the prompt pipeline passes the set in from the per-request SystemConfigSnapshot so
    // this class does not issue its own config query on every submission.
    public List<DetectionFinding> detectAll(String text, Set<EntityType> disabled) {
        List<DetectionFinding> findings = new ArrayList<>();
        for (Detector detector : detectors) {
            if (disabled.contains(detector.getEntityType())) {
                continue;
            }
            findings.addAll(detector.detect(text));
        }
        List<DetectionFinding> resolved = resolveOverlaps(findings);
        // Entity types and count only - never the matched value itself.
        log.debug("Detection engine found {} finding(s): {}", resolved.size(),
                resolved.stream().map(f -> f.getEntityType().name()).distinct().toList());
        return resolved;
    }

    private Set<EntityType> loadDisabledDetectors() {
        // an unknown detector name in this row used to throw from EntityType.valueOf on
        // every submission thereafter. Unknown entries are now skipped with a WARN instead.
        return systemConfigRepository.findByConfigKey(DISABLED_DETECTORS_CONFIG_KEY)
                .map(SystemConfig::getConfigValue)
                .filter(value -> !value.isBlank())
                .map(value -> SystemConfigValues.parseEntityTypes(DISABLED_DETECTORS_CONFIG_KEY, value))
                .orElse(Set.of());
    }

    // Greedily accepts findings in priority order (highest confidence, then highest
    // severity), skipping any whose span overlaps an already-accepted finding.
    private List<DetectionFinding> resolveOverlaps(List<DetectionFinding> findings) {
        List<DetectionFinding> byPriority = new ArrayList<>(findings);
        byPriority.sort(Comparator
                .comparingDouble(DetectionFinding::getConfidence).reversed()
                .thenComparingInt(f -> SEVERITY_ORDER.indexOf(f.getEntityType())));

        List<DetectionFinding> accepted = new ArrayList<>();
        for (DetectionFinding candidate : byPriority) {
            boolean overlaps = accepted.stream().anyMatch(a -> rangesOverlap(a, candidate));
            if (!overlaps) {
                accepted.add(candidate);
            }
        }
        accepted.sort(Comparator.comparingInt(DetectionFinding::getStartPos));
        return accepted;
    }

    private boolean rangesOverlap(DetectionFinding a, DetectionFinding b) {
        return a.getStartPos() < b.getEndPos() && b.getStartPos() < a.getEndPos();
    }
}
