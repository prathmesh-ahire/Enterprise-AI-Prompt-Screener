package com.screener.service;

/**
 * Thrown by {@link AiGatewayService} whenever the AI model call fails or times out
 *. Caught by the caller and turned into a 503 response —
 * the prompt must never be marked COMPLETED when this is thrown.
 */
public class AiGatewayException extends RuntimeException {
    public AiGatewayException(String message, Throwable cause) {
        super(message, cause);
    }
}
