package com.screener.service;

import org.junit.jupiter.api.Test;
import org.springframework.ai.chat.client.ChatClient;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
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

        AiGatewayService gateway = new AiGatewayService(builder, 5000, 500);

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

        AiGatewayService gateway = new AiGatewayService(builder, 5000, 500);

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
        AiGatewayService gateway = new AiGatewayService(builder, 1, 500);

        assertThrows(AiGatewayException.class, () -> gateway.send("hi"));
    }

    private ChatClient.Builder fluentBuilderMock() {
        ChatClient.Builder builder = mock(ChatClient.Builder.class);
        when(builder.defaultSystem(anyString())).thenReturn(builder);
        when(builder.defaultOptions(any())).thenReturn(builder);
        return builder;
    }
}
