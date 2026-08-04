package com.screener.detection;

import com.screener.model.DetectionFinding;
import com.screener.model.EntityType;
import com.screener.model.SystemConfig;
import com.screener.repository.SystemConfigRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Runs every registered {@link Detector} bean and returns the merged, overlap-resolved
 * findings. Skips detectors named in the {@code disabled_detectors} system_config row
 * (comma-separated {@link EntityType} names, all enabled if the row is missing/blank) —
 * this is what makes the admin's per-detector toggle (Phase 20.3/31.1) actually do
 * something. Adding a new {@link Detector} bean (as this class did for Phase 9) requires
 * no change here — Spring collects them into {@code detectors} automatically.
 */
@Component
@RequiredArgsConstructor
public class DetectionEngine {

    // Public: AdminService (Phase 20.3) reads/writes this same key.
    public static final String DISABLED_DETECTORS_CONFIG_KEY = "disabled_detectors";

    // Priority order for tie-breaking overlapping findings of equal confidence — most
    // severe first, so e.g. PRIVATE_KEY always wins over a lower-severity overlap.
    // Public: DashboardService (Phase 21.4) reuses this same ordering to pick a single
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

    public List<DetectionFinding> detectAll(String text) {
        Set<EntityType> disabled = loadDisabledDetectors();
        List<DetectionFinding> findings = new ArrayList<>();
        for (Detector detector : detectors) {
            if (disabled.contains(detector.getEntityType())) {
                continue;
            }
            findings.addAll(detector.detect(text));
        }
        return resolveOverlaps(findings);
    }

    private Set<EntityType> loadDisabledDetectors() {
        return systemConfigRepository.findByConfigKey(DISABLED_DETECTORS_CONFIG_KEY)
                .map(SystemConfig::getConfigValue)
                .filter(value -> !value.isBlank())
                .map(value -> java.util.Arrays.stream(value.split(","))
                        .map(String::trim)
                        .map(EntityType::valueOf)
                        .collect(Collectors.toSet()))
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
