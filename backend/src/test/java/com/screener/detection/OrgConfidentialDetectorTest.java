package com.screener.detection;

import com.screener.model.DetectionFinding;
import com.screener.model.EntityType;
import com.screener.model.OrgConfidentialTerm;
import com.screener.repository.OrgConfidentialTermRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class OrgConfidentialDetectorTest {

    @Mock
    private OrgConfidentialTermRepository orgConfidentialTermRepository;

    @Test
    void detectsSeededTermPresentInText() {
        when(orgConfidentialTermRepository.findByActiveTrue()).thenReturn(List.of(term("Project Chimera")));
        OrgConfidentialDetector detector = new OrgConfidentialDetector(orgConfidentialTermRepository);

        List<DetectionFinding> findings = detector.detect("The codename is Project Chimera, keep it internal");

        assertEquals(1, findings.size());
        assertEquals(EntityType.ORG_CONFIDENTIAL, findings.get(0).getEntityType());
    }

    @Test
    void findsNothingWhenSeededTermIsAbsentFromText() {
        when(orgConfidentialTermRepository.findByActiveTrue()).thenReturn(List.of(term("Project Chimera")));
        OrgConfidentialDetector detector = new OrgConfidentialDetector(orgConfidentialTermRepository);

        List<DetectionFinding> findings = detector.detect("Nothing related to that topic here");

        assertTrue(findings.isEmpty());
    }

    // "Nova" must not match inside "Novartis" - the detector's \b word-boundary matching
    // (not a bare substring search) is what's actually under test here.
    @Test
    void rejectsPartialWordMatchInsideALongerWord() {
        when(orgConfidentialTermRepository.findByActiveTrue()).thenReturn(List.of(term("Nova")));
        OrgConfidentialDetector detector = new OrgConfidentialDetector(orgConfidentialTermRepository);

        List<DetectionFinding> findings = detector.detect("We use Novartis as a supplier");

        assertTrue(findings.isEmpty());
    }

    private OrgConfidentialTerm term(String value) {
        OrgConfidentialTerm term = new OrgConfidentialTerm();
        term.setTerm(value);
        term.setActive(true);
        return term;
    }
}
