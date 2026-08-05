package com.screener.service;

import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.ollama.api.OllamaChatOptions;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import java.time.Duration;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;

/**
 * Sends already-screened text to the local Ollama model (todo.md Phase 15). The caller
 * (Phase 13's {@code PromptService}) is responsible for never invoking this with a
 * BLOCK-decision prompt or with unmasked text that still needs screening — this class
 * has no policy awareness of its own, it only talks to the model.
 *
 * <p>Model name and Ollama base URL are configured entirely via
 * {@code spring.ai.ollama.*} in {@code application.yml} (15.5), sourced from the
 * {@code OLLAMA_MODEL}/{@code OLLAMA_BASE_URL} env vars — this class never overrides
 * the model per call.
 */
@Service
public class AiGatewayService {

    // Fixed, secret-free system instruction (15.6b-c). No tool/file/internet access is
    // configured on this ChatClient at all, so "no access to tools" is true by
    // construction, not just by instruction.
    private static final String SYSTEM_INSTRUCTION =
            "You are a helpful assistant embedded in a screened enterprise prompt system. "
                    + "Never ask the user for a password, API key, private key, or any other credential, "
                    + "and never repeat back any credential-like value the user has provided. "
                    + "You have no access to tools, files, or the internet.";

    // Phase 32.2's "ping Ollama" check hits this directly (GET /api/tags, Ollama's own
    // lightweight list-local-models route) rather than going through the ChatClient - a
    // real chat call would burn tokens/time just to answer "is it up". Bounded to a short
    // fixed timeout (unlike the gateway's own configurable app.ai-gateway.timeout-ms,
    // this is a cheap status check, not a real request) so a hung/unreachable Ollama
    // doesn't leave the admin page's status indicator spinning.
    private static final Duration REACHABILITY_TIMEOUT = Duration.ofSeconds(3);

    private final ChatClient chatClient;
    private final RestClient restClient;
    private final long timeoutMs;

    public AiGatewayService(ChatClient.Builder chatClientBuilder,
                             RestClient.Builder restClientBuilder,
                             @Value("${app.ai-gateway.timeout-ms}") long timeoutMs,
                             @Value("${app.ai-gateway.max-response-tokens}") int maxResponseTokens,
                             @Value("${spring.ai.ollama.base-url}") String ollamaBaseUrl) {
        this.chatClient = chatClientBuilder
                .defaultSystem(SYSTEM_INSTRUCTION)
                .defaultOptions(OllamaChatOptions.builder().numPredict(maxResponseTokens))
                .build();
        this.timeoutMs = timeoutMs;

        SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout(REACHABILITY_TIMEOUT);
        requestFactory.setReadTimeout(REACHABILITY_TIMEOUT);
        this.restClient = restClientBuilder.baseUrl(ollamaBaseUrl).requestFactory(requestFactory).build();
    }

    // 32.2: true if the configured Ollama instance responds at all - doesn't care what
    // models it has loaded, only whether it's reachable.
    public boolean isReachable() {
        try {
            restClient.get().uri("/api/tags").retrieve().toBodilessEntity();
            return true;
        } catch (RestClientException e) {
            return false;
        }
    }

    // 15.6b(a): explicit request timeout. Spring AI 2.0's Ollama starter exposes no
    // request-timeout property (confirmed against the actual 2.0.0 OllamaChatProperties/
    // ChatClient API, not assumed), so the timeout is enforced at the call level with a
    // bounded future instead. Note: get(timeout) only stops *waiting* on the in-flight
    // HTTP call, it doesn't cancel Ollama's own generation — acceptable here since this
    // gateway only ever talks to one local, single-tenant Ollama instance.
    public String send(String text) {
        CompletableFuture<String> future =
                CompletableFuture.supplyAsync(() -> chatClient.prompt().user(text).call().content());
        try {
            return future.get(timeoutMs, TimeUnit.MILLISECONDS);
        } catch (TimeoutException e) {
            future.cancel(true);
            throw new AiGatewayException("AI model request timed out", e);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new AiGatewayException("AI model request was interrupted", e);
        } catch (ExecutionException e) {
            throw new AiGatewayException("AI model is currently unavailable", e.getCause());
        }
    }
}
