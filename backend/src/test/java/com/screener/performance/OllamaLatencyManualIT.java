package com.screener.performance;

import com.screener.service.AiGatewayService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

import java.util.ArrayList;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertFalse;

/**
 * todo.md Phase 38.3 - separately measures average real Ollama response latency on this
 * machine, calling the real {@link AiGatewayService} against a genuinely running Ollama
 * instance (Phase 15). Deliberately named with an "IT" suffix, not "...Test" - Maven
 * Surefire's default include patterns ({@code **}{@code /*Test.java}, {@code Test*.java},
 * {@code *Tests.java}, {@code *TestCase.java}) do not match it and no Failsafe plugin is
 * configured in this project, so `mvn test` / the Phase 34 CI build never picks this class
 * up automatically - it has no access to a live Ollama container. Run it explicitly and
 * manually, only when Ollama is actually up:
 *
 * <pre>mvnw test -Dtest=OllamaLatencyManualIT</pre>
 *
 * <p>The first call is a deliberate throw-away warm-up (Phase 15/18/22's already-documented
 * cold-start behaviour: an idle-unloaded model's first request can time out or take far
 * longer while it loads) and is excluded from the reported average so the number reflects
 * steady-state latency, not a one-off outlier.
 */
@SpringBootTest
@ActiveProfiles("test")
class OllamaLatencyManualIT {

    private static final int MEASURED_CALLS = 5;

    @Autowired private AiGatewayService aiGatewayService;

    @Test
    void measuresAverageRealOllamaResponseLatency() {
        // Warm-up call, discarded - see class javadoc.
        aiGatewayService.send("Say hello in one short sentence.");

        List<Long> latenciesMs = new ArrayList<>(MEASURED_CALLS);
        for (int i = 0; i < MEASURED_CALLS; i++) {
            long startNanos = System.nanoTime();
            String response = aiGatewayService.send("Tell me one short, unique fun fact, attempt " + i + ".");
            long elapsedMs = (System.nanoTime() - startNanos) / 1_000_000;
            latenciesMs.add(elapsedMs);
            assertFalse(response.isBlank());
        }

        double average = latenciesMs.stream().mapToLong(Long::longValue).average().orElse(0.0);
        long max = latenciesMs.stream().mapToLong(Long::longValue).max().orElse(0L);

        System.out.println("=== Phase 38.3: real Ollama response latency, " + MEASURED_CALLS
                + " warmed-up calls ===");
        System.out.printf("Average: %.2f ms%n", average);
        System.out.println("Max: " + max + " ms");
        System.out.println("Per-call latencies (ms): " + latenciesMs);
    }
}
