package com.screener.controller;

import com.screener.dto.PromptHistoryItemDto;
import com.screener.dto.PromptRequestDto;
import com.screener.dto.PromptResponseDto;
import com.screener.model.User;
import com.screener.repository.UserRepository;
import com.screener.service.PromptService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.NoSuchElementException;
import java.util.UUID;

@RestController
@RequestMapping("/api/prompts")
@RequiredArgsConstructor
public class PromptController {

    private final PromptService promptService;
    private final UserRepository userRepository;

    @PostMapping("/submit")
    @PreAuthorize("hasRole('USER')")
    public ResponseEntity<PromptResponseDto> submit(@Valid @RequestBody PromptRequestDto request,
                                                      @AuthenticationPrincipal UserDetails userDetails) {
        User user = userRepository.findByUsername(userDetails.getUsername())
                .orElseThrow(() -> new NoSuchElementException("User not found"));
        return ResponseEntity.ok(promptService.processPrompt(request.text(), user.getId()));
    }

    @PostMapping("/{requestId}/confirm")
    @PreAuthorize("hasRole('USER')")
    public ResponseEntity<PromptResponseDto> confirm(@PathVariable UUID requestId,
                                                       @AuthenticationPrincipal UserDetails userDetails) {
        User user = userRepository.findByUsername(userDetails.getUsername())
                .orElseThrow(() -> new NoSuchElementException("User not found"));
        return ResponseEntity.ok(promptService.confirmAndSend(requestId, user.getId()));
    }

    @GetMapping("/my-history")
    @PreAuthorize("hasRole('USER')")
    public ResponseEntity<Page<PromptHistoryItemDto>> myHistory(@AuthenticationPrincipal UserDetails userDetails,
                                                                   @PageableDefault(size = 10) Pageable pageable) {
        User user = userRepository.findByUsername(userDetails.getUsername())
                .orElseThrow(() -> new NoSuchElementException("User not found"));
        return ResponseEntity.ok(promptService.getMyHistory(user.getId(), pageable));
    }

    @GetMapping("/{requestId}")
    @PreAuthorize("hasRole('USER')")
    public ResponseEntity<PromptResponseDto> getOne(@PathVariable UUID requestId,
                                                       @AuthenticationPrincipal UserDetails userDetails) {
        User user = userRepository.findByUsername(userDetails.getUsername())
                .orElseThrow(() -> new NoSuchElementException("User not found"));
        return ResponseEntity.ok(promptService.getMyPromptDetails(requestId, user.getId()));
    }
}
