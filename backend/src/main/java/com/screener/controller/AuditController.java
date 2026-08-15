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

import java.util.NoSuchElementException;

/**
 * todo.md Phase 17.4. {@code my-history} never accepts a target user id from the
 * caller — it always filters by whoever the JWT resolves to — so there is no parameter
 * a USER could tamper with to read another user's events (17.5).
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
        return ResponseEntity.ok(auditEventRepository.findByUserId(user.getId(), pageable).map(this::toDto));
    }

    @GetMapping("/all")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Page<AuditEventDto>> all(@PageableDefault(size = 20, sort = "createdAt",
            direction = Sort.Direction.DESC) Pageable pageable) {
        return ResponseEntity.ok(auditEventRepository.findAll(pageable).map(this::toDto));
    }

    private AuditEventDto toDto(AuditEvent event) {
        return new AuditEventDto(event.getId(), event.getUserId(), event.getAction(),
                event.getRequestId(), event.getRiskBand(), event.getCreatedAt());
    }
}
