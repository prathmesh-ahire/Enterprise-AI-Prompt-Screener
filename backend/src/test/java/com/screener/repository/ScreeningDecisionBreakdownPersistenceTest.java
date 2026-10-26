package com.screener.repository;

import com.screener.model.Decision;
import com.screener.model.ScreeningDecision;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

/**
 * the seven breakdown columns survive a real save and reload through JPA, and a
 * row saved without them reads back as null, not zero.
 *
 * <p>Not transactional on purpose: each repository call runs in its own transaction, so
 * the reload is a fresh read from the database rather than the entity still held in a
 * persistence context. This proves the mapping on H2 only - the real MySQL schema is
 * checked separately with SHOW CREATE TABLE (a standing rule for schema changes).
 */
@SpringBootTest
@ActiveProfiles("test")
class ScreeningDecisionBreakdownPersistenceTest {

    @Autowired private ScreeningDecisionRepository screeningDecisionRepository;

    private final List<ScreeningDecision> saved = new ArrayList<>();

    @AfterEach
    void cleanUp() {
        screeningDecisionRepository.deleteAll(saved);
    }

    @Test
    void breakdownColumnsRoundTrip() {
        ScreeningDecision decision = baseDecision();
        decision.setSensitiveDataScore(0.5);
        decision.setInjectionScore(0.4);
        decision.setSecretCriticalityScore(0.8);
        decision.setPolicyContextScore(0.315);
        decision.setObfuscationScore(0.0);
        decision.setScoreBand(Decision.MASK);
        decision.setAppliedOverrides("CRITICAL_SECRET");
        saved.add(screeningDecisionRepository.save(decision));

        ScreeningDecision reloaded = screeningDecisionRepository.findByRequestId(decision.getRequestId()).orElseThrow();

        assertEquals(0.5, reloaded.getSensitiveDataScore());
        assertEquals(0.4, reloaded.getInjectionScore());
        assertEquals(0.8, reloaded.getSecretCriticalityScore());
        assertEquals(0.315, reloaded.getPolicyContextScore());
        assertEquals(0.0, reloaded.getObfuscationScore());
        assertEquals(Decision.MASK, reloaded.getScoreBand());
        assertEquals("CRITICAL_SECRET", reloaded.getAppliedOverrides());
    }

    @Test
    void emptyOverrideListRoundTripsAsAnEmptyStringNotNull() {
        ScreeningDecision decision = baseDecision();
        decision.setScoreBand(Decision.ALLOW);
        decision.setAppliedOverrides("");
        saved.add(screeningDecisionRepository.save(decision));

        ScreeningDecision reloaded = screeningDecisionRepository.findByRequestId(decision.getRequestId()).orElseThrow();

        assertEquals("", reloaded.getAppliedOverrides());
    }

    @Test
    void aRowSavedWithoutABreakdownReadsBackAsNull() {
        ScreeningDecision decision = baseDecision();
        saved.add(screeningDecisionRepository.save(decision));

        ScreeningDecision reloaded = screeningDecisionRepository.findByRequestId(decision.getRequestId()).orElseThrow();

        assertNull(reloaded.getSensitiveDataScore());
        assertNull(reloaded.getScoreBand());
        assertNull(reloaded.getAppliedOverrides());
    }

    private ScreeningDecision baseDecision() {
        ScreeningDecision decision = new ScreeningDecision();
        decision.setRequestId(UUID.randomUUID());
        decision.setDecision(Decision.BLOCK);
        decision.setRiskScore(36.6);
        decision.setExplanation("test");
        decision.setPolicyVersion(1);
        decision.setTimestamp(LocalDateTime.now());
        decision.setProcessingTimeMs(5L);
        return decision;
    }
}
