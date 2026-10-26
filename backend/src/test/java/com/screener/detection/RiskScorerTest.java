package com.screener.detection;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class RiskScorerTest {

    private static final double DELTA = 0.0001;

    private final RiskScorer scorer = new RiskScorer();

    @Test
    void allSubScoresAtMaximumProducesScoreOf100() {
        assertEquals(100.0, scorer.score(new RiskSubScores(1.0, 1.0, 1.0, 1.0, 1.0)), DELTA);
    }

    @Test
    void allSubScoresAtZeroProducesScoreOfZero() {
        assertEquals(0.0, scorer.score(new RiskSubScores(0.0, 0.0, 0.0, 0.0, 0.0)), DELTA);
    }

    @Test
    void weightsTheFiveSubScoresPerTheSpecifiedFormula() {
        // 100 * (0.35*0.65 + 0.25*0.4 + 0.20*0.8 + 0.10*0.5 + 0.10*0.6) = 59.75
        RiskSubScores subScores = new RiskSubScores(0.65, 0.4, 0.8, 0.5, 0.6);
        assertEquals(59.75, scorer.score(subScores), DELTA);
    }

    // a synthetic sub-score tuple modeling one HIGH-severity finding (sensitiveData
    // 0.5, secretCriticality 1.0 - the per-finding caps a single finding can reach) plus a
    // realistic policy-context baseline (0.6) and a touch of accompanying injection-style
    // language (0.3). This is a RiskScorer-formula test with hand-picked inputs, same as
    // weightsTheFiveSubScoresPerTheSpecifiedFormula above - NOT a claim that a single
    // finding alone (with injectionScore/obfuscationScore at 0) can reach this band; it
    // provably cannot under this formula (max ceiling 47.5).
    @Test
    void oneHighSeverityFindingWithAccompanyingContextLandsInConfirmReviewBand() {
        // 100 * (0.35*0.5 + 0.25*0.3 + 0.20*1.0 + 0.10*0.6 + 0.10*0) = 51.0
        RiskSubScores subScores = new RiskSubScores(0.5, 0.3, 1.0, 0.6, 0.0);
        double score = scorer.score(subScores);
        assertTrue(score >= 50.0 && score < 75.0);
    }

    @Test
    void policyContextScoreAloneMovesTheTotalAwayFromZero() {
        assertEquals(10.0, scorer.score(new RiskSubScores(0.0, 0.0, 0.0, 1.0, 0.0)), DELTA);
    }

    @Test
    void obfuscationScoreAloneMovesTheTotalAwayFromZero() {
        assertEquals(10.0, scorer.score(new RiskSubScores(0.0, 0.0, 0.0, 0.0, 1.0)), DELTA);
    }
}
