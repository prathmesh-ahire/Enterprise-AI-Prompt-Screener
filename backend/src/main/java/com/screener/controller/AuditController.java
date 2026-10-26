package com.screener.controller;

import com.screener.dto.AuditEventDto;
import com.screener.model.AuditEvent;
import com.screener.model.User;
import com.screener.repository.AuditEventRepository;
import com.screener.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;
import java.util.NoSuchElementException;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * {@code my-history} never accepts a target user id from the
 * caller — it always filters by whoever the JWT resolves to — so there is no parameter
 * a USER could tamper with to read another user's events.
 */
@RestController
@RequestMapping("/api/audit")
@RequiredArgsConstructor
public class AuditController {

    private final AuditEventRepository auditEventRepository;
    private final UserRepository userRepository;

    @GetMapping("/my-history")
    @PreAuthorize("hasRole('USER')")
    public ResponseEntity<Page<AuditEventDto>> myHistory(@AuthenticationPrincipal UserDetails userDetails,
                                                            @PageableDefault(size = 20, sort = "createdAt",
                                                                    direction = Sort.Direction.DESC) Pageable pageable) {
        User user = userRepository.findByUsername(userDetails.getUsername())
                .orElseThrow(() -> new NoSuchElementException("User not found"));
        return ResponseEntity.ok(withUsernames(auditEventRepository.findByUserId(user.getId(), pageable)));
    }

    @GetMapping("/all")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Page<AuditEventDto>> all(@PageableDefault(size = 20, sort = "createdAt",
            direction = Sort.Direction.DESC) Pageable pageable) {
        return ResponseEntity.ok(withUsernames(auditEventRepository.findAll(pageable)));
    }

    // one batched user lookup per page, never one query per row - same goal as the
    // join for the repeated-violations panel. AuditEvent.userId is a plain Long, not a
    // relationship, so the names are resolved here rather than fetched with the events.
    private Page<AuditEventDto> withUsernames(Page<AuditEvent> page) {
        Set<Long> userIds = page.getContent().stream()
                .map(AuditEvent::getUserId)
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());
        Map<Long, String> usernames = userRepository.findAllById(userIds).stream()
                .collect(Collectors.toMap(User::getId, User::getUsername));
        return page.map(event -> toDto(event, usernames.get(event.getUserId())));
    }

    private AuditEventDto toDto(AuditEvent event, String username) {
        return new AuditEventDto(event.getId(), event.getUserId(), username, event.getAction(),
                event.getRequestId(), event.getRiskBand(), event.getCreatedAt());
    }
}
