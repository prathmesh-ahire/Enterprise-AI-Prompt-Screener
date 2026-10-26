package com.screener.detection;

import com.screener.model.DetectionFinding;
import com.screener.model.EntityType;

import java.util.ArrayList;
import java.util.List;

/**
 * Two-pass detector contract: {@link #findCandidates} (pass 1, format matching) followed
 * by {@link #validate} (pass 2, false-positive filtering) — per the project document's
 * detection spec.
 */
public interface Detector {

    EntityType getEntityType();

    List<Candidate> findCandidates(String text);

    /**
     * Returns a confidence score in (0, 1] if the candidate is accepted, or 0.0 to reject it.
     */
    double validate(String text, Candidate candidate);

    default List<DetectionFinding> detect(String text) {
        List<DetectionFinding> findings = new ArrayList<>();
        for (Candidate candidate : findCandidates(text)) {
            double confidence = validate(text, candidate);
            if (confidence > 0.0) {
                DetectionFinding finding = new DetectionFinding();
                finding.setEntityType(getEntityType());
                finding.setStartPos(candidate.start());
                finding.setEndPos(candidate.end());
                finding.setConfidence(confidence);
                findings.add(finding);
            }
        }
        return findings;
    }
}
