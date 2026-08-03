package com.screener.detection;

import com.screener.model.DetectionFinding;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;

/**
 * Runs every registered {@link Detector} bean and returns the merged findings.
 * Only 4 detectors exist as of Phase 8 (Email/Phone/PAN/Aadhaar); Phase 9 adds the
 * remaining 5 and wires in overlap-resolution + the per-detector enable/disable check
 * (9.6) — this class needs no changes when those beans are added, Spring collects them
 * into {@code detectors} automatically.
 */
@Component
@RequiredArgsConstructor
public class DetectionEngine {

    private final List<Detector> detectors;

    public List<DetectionFinding> detectAll(String text) {
        List<DetectionFinding> findings = new ArrayList<>();
        for (Detector detector : detectors) {
            findings.addAll(detector.detect(text));
        }
        return findings;
    }
}
