package com.screener.service;

import com.screener.dto.PromptResponseDto;
import com.screener.model.PromptRequest;
import com.screener.model.PromptStatus;
import com.screener.model.SystemConfig;
import com.screener.repository.PromptRequestRepository;
import com.screener.repository.SystemConfigRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.LocalDateTime;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class PromptService {

    private static final String MAX_LENGTH_CONFIG_KEY = "max_prompt_length";
    private static final int DEFAULT_MAX_LENGTH = 2000;

    private final PromptRequestRepository promptRequestRepository;
    private final SystemConfigRepository systemConfigRepository;

    public PromptResponseDto processPrompt(String rawText, Long userId) {
        String normalised = normalise(rawText);

        if (normalised.isBlank()) {
            throw new IllegalArgumentException("Prompt text cannot be blank");
        }

        int maxLength = resolveMaxLength();
        if (normalised.length() > maxLength) {
            throw new IllegalArgumentException(
                    "Prompt exceeds the maximum allowed length of " + maxLength + " characters");
        }

        UUID requestId = UUID.randomUUID();

        PromptRequest promptRequest = new PromptRequest();
        promptRequest.setRequestId(requestId);
        promptRequest.setUserId(userId);
        promptRequest.setPromptText(normalised);
        promptRequest.setPromptHash(sha256Hex(normalised));
        promptRequest.setStatus(PromptStatus.PENDING);
        promptRequest.setSubmittedAt(LocalDateTime.now());
        promptRequestRepository.save(promptRequest);

        return new PromptResponseDto(requestId, promptRequest.getStatus().name(), null, null, null, null);
    }

    private String normalise(String text) {
        String withUnixLineEndings = text.trim().replace("\r\n", "\n").replace("\r", "\n");
        return stripUnsafeControlChars(withUnixLineEndings);
    }

    // Strips only C0/DEL control characters (except \n and \t) — deliberately leaves
    // zero-width/unicode-spacing characters untouched so RiskAnalysisEngine's Obfuscation
    // Signal check (Phase 10.7) still sees them.
    private String stripUnsafeControlChars(String text) {
        StringBuilder cleaned = new StringBuilder(text.length());
        for (int i = 0; i < text.length(); i++) {
            char c = text.charAt(i);
            boolean isUnsafeControl = (c < 0x20 && c != '\n' && c != '\t') || c == 0x7F;
            if (!isUnsafeControl) {
                cleaned.append(c);
            }
        }
        return cleaned.toString();
    }

    private int resolveMaxLength() {
        return systemConfigRepository.findByConfigKey(MAX_LENGTH_CONFIG_KEY)
                .map(SystemConfig::getConfigValue)
                .map(Integer::parseInt)
                .orElse(DEFAULT_MAX_LENGTH);
    }

    private String sha256Hex(String text) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(text.getBytes(StandardCharsets.UTF_8));
            StringBuilder hex = new StringBuilder(hash.length * 2);
            for (byte b : hash) {
                hex.append(String.format("%02x", b));
            }
            return hex.toString();
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 algorithm not available", e);
        }
    }
}
