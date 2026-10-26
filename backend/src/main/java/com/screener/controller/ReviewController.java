package com.screener.controller;

import com.screener.dto.PromptResponseDto;
import com.screener.dto.ReviewDecisionRequest;
import com.screener.dto.ReviewDetailsDto;
import com.screener.dto.ReviewQueueItemDto;
import com.screener.model.User;
import com.screener.repository.UserRepository;
import com.screener.service.ReviewService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
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

import java.util.List;
import java.util.NoSuchElementException;
import java.util.UUID;

/**
 * Every route here is usable by REVIEWER and ADMIN alike - the
 * frontend review page is meant to be usable by both roles, so
 * {@code @PreAuthorize} allows both on all three endpoints, not just {@code /decide}.
 */
@RestController
@RequestMapping("/api/review")
@RequiredArgsConstructor
public class ReviewController {

    private final ReviewService reviewService;
    private final UserRepository userRepository;

    @GetMapping("/queue")
    @PreAuthorize("hasAnyRole('REVIEWER','ADMIN')")
    public ResponseEntity<List<ReviewQueueItemDto>> queue() {
        return ResponseEntity.ok(reviewService.getQueue());
    }

    @GetMapping("/{requestId}/details")
    @PreAuthorize("hasAnyRole('REVIEWER','ADMIN')")
    public ResponseEntity<ReviewDetailsDto> details(@PathVariable UUID requestId) {
        return ResponseEntity.ok(reviewService.getDetails(requestId));
    }

    @PostMapping("/{requestId}/decide")
    @PreAuthorize("hasAnyRole('REVIEWER','ADMIN')")
    public ResponseEntity<PromptResponseDto> decide(@PathVariable UUID requestId,
                                                       @Valid @RequestBody ReviewDecisionRequest request,
                                                       @AuthenticationPrincipal UserDetails userDetails) {
        User reviewer = userRepository.findByUsername(userDetails.getUsername())
                .orElseThrow(() -> new NoSuchElementException("User not found"));
        return ResponseEntity.ok(
                reviewService.decide(requestId, reviewer.getId(), request.action(), request.reason()));
    }
}
