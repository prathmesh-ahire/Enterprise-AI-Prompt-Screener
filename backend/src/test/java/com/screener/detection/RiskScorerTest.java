package com.screener.detection;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;

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
}
