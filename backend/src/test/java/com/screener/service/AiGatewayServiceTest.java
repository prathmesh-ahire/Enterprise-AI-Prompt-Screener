package com.screener.service;

import org.junit.jupiter.api.Test;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.http.ResponseEntity;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class AiGatewayServiceTest {

    @Test
    void returnsTheModelsResponseContent() {
        ChatClient.Builder builder = fluentBuilderMock();
        ChatClient chatClient = mock(ChatClient.class);
        ChatClient.ChatClientRequestSpec requestSpec = mock(ChatClient.ChatClientRequestSpec.class);
        ChatClient.CallResponseSpec callResponseSpec = mock(ChatClient.CallResponseSpec.class);

        when(builder.build()).thenReturn(chatClient);
        when(chatClient.prompt()).thenReturn(requestSpec);
        when(requestSpec.user(anyString())).thenReturn(requestSpec);
        when(requestSpec.call()).thenReturn(callResponseSpec);
        when(callResponseSpec.content()).thenReturn("Hello there");

        AiGatewayService gateway = new AiGatewayService(builder, fluentRestBuilderMock(), 5000, 500, "http://localhost:11434");

        assertEquals("Hello there", gateway.send("hi"));
    }

    @Test
    void wrapsAFailedCallInAiGatewayException() {
        ChatClient.Builder builder = fluentBuilderMock();
        ChatClient chatClient = mock(ChatClient.class);
        ChatClient.ChatClientRequestSpec requestSpec = mock(ChatClient.ChatClientRequestSpec.class);

        when(builder.build()).thenReturn(chatClient);
        when(chatClient.prompt()).thenReturn(requestSpec);
        when(requestSpec.user(anyString())).thenReturn(requestSpec);
        when(requestSpec.call()).thenThrow(new RuntimeException("connection refused"));

        AiGatewayService gateway = new AiGatewayService(builder, fluentRestBuilderMock(), 5000, 500, "http://localhost:11434");

        assertThrows(AiGatewayException.class, () -> gateway.send("hi"));
    }

    @Test
    void wrapsASlowCallInAiGatewayExceptionWhenItExceedsTheConfiguredTimeout() {
        ChatClient.Builder builder = fluentBuilderMock();
        ChatClient chatClient = mock(ChatClient.class);
        ChatClient.ChatClientRequestSpec requestSpec = mock(ChatClient.ChatClientRequestSpec.class);
        ChatClient.CallResponseSpec callResponseSpec = mock(ChatClient.CallResponseSpec.class);

        when(builder.build()).thenReturn(chatClient);
        when(chatClient.prompt()).thenReturn(requestSpec);
        when(requestSpec.user(anyString())).thenReturn(requestSpec);
        when(requestSpec.call()).thenAnswer(invocation -> {
            Thread.sleep(300);
            return callResponseSpec;
        });

        // Deliberately unreasonably low timeout (1ms), mirroring 15.7's manual timeout check.
        AiGatewayService gateway = new AiGatewayService(builder, fluentRestBuilderMock(), 1, 500, "http://localhost:11434");

        assertThrows(AiGatewayException.class, () -> gateway.send("hi"));
    }

    @Test
    @SuppressWarnings({ "unchecked", "rawtypes" })
    void isReachableReturnsTrueWhenOllamaResponds() {
        ChatClient.Builder chatBuilder = fluentBuilderMock();
        RestClient.RequestHeadersUriSpec uriSpec = mock(RestClient.RequestHeadersUriSpec.class);
        RestClient.ResponseSpec responseSpec = mock(RestClient.ResponseSpec.class);
        when(uriSpec.uri(anyString())).thenReturn(uriSpec);
        when(uriSpec.retrieve()).thenReturn(responseSpec);
        when(responseSpec.toBodilessEntity()).thenReturn(ResponseEntity.ok().build());

        AiGatewayService gateway = new AiGatewayService(chatBuilder, fluentRestBuilderMock(uriSpec), 5000, 500, "http://localhost:11434");

        assertTrue(gateway.isReachable());
    }

    @Test
    @SuppressWarnings({ "unchecked", "rawtypes" })
    void isReachableReturnsFalseWhenOllamaCallFails() {
        ChatClient.Builder chatBuilder = fluentBuilderMock();
        RestClient.RequestHeadersUriSpec uriSpec = mock(RestClient.RequestHeadersUriSpec.class);
        when(uriSpec.uri(anyString())).thenReturn(uriSpec);
        when(uriSpec.retrieve()).thenThrow(new RestClientException("connection refused"));

        AiGatewayService gateway = new AiGatewayService(chatBuilder, fluentRestBuilderMock(uriSpec), 5000, 500, "http://localhost:11434");

        assertFalse(gateway.isReachable());
    }

    private ChatClient.Builder fluentBuilderMock() {
        ChatClient.Builder builder = mock(ChatClient.Builder.class);
        when(builder.defaultSystem(anyString())).thenReturn(builder);
        when(builder.defaultOptions(any())).thenReturn(builder);
        return builder;
    }

    // Constructor-only stub: baseUrl/requestFactory/build just need to chain through so
    // AiGatewayService's constructor doesn't NPE; isReachable() itself is exercised via
    // the RequestHeadersUriSpec mock passed in by the reachability tests above. Raw type
    // throughout (not RequestHeadersUriSpec<?>) - mocking this self-referential generic
    // builder with wildcards hits Java's wildcard-capture rules on the chained
    // when(...).thenReturn(uriSpec) calls; raw types sidestep that at the cost of an
    // unchecked-warning, same tradeoff Spring's own RestClient tests make.
    @SuppressWarnings({ "unchecked", "rawtypes" })
    private RestClient.Builder fluentRestBuilderMock() {
        return fluentRestBuilderMock(mock(RestClient.RequestHeadersUriSpec.class));
    }

    @SuppressWarnings({ "unchecked", "rawtypes" })
    private RestClient.Builder fluentRestBuilderMock(RestClient.RequestHeadersUriSpec uriSpec) {
        RestClient.Builder restBuilder = mock(RestClient.Builder.class);
        RestClient restClient = mock(RestClient.class);
        when(restBuilder.baseUrl(anyString())).thenReturn(restBuilder);
        when(restBuilder.requestFactory(any())).thenReturn(restBuilder);
        when(restBuilder.build()).thenReturn(restClient);
        when(restClient.get()).thenReturn(uriSpec);
        return restBuilder;
    }
}
