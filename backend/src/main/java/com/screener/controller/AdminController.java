package com.screener.controller;

import com.screener.dto.AdminPolicyDto;
import com.screener.dto.AdminUserDto;
import com.screener.dto.ApprovedModelCreateRequest;
import com.screener.dto.ApprovedModelDto;
import com.screener.dto.ApprovedModelUpdateRequest;
import com.screener.dto.OllamaStatusDto;
import com.screener.dto.OrgTermCreateRequest;
import com.screener.dto.OrgTermDto;
import com.screener.dto.PromptHistoryItemDto;
import com.screener.dto.RetentionDto;
import com.screener.model.AccountStatus;
import com.screener.model.User;
import com.screener.repository.UserRepository;
import com.screener.service.AdminService;
import com.screener.service.AiGatewayService;
import com.screener.service.PromptService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.NoSuchElementException;

/**
 * todo.md Phase 20.1 — every route under {@code /api/admin/**} requires ADMIN, enforced
 * once at the class level since it applies uniformly here (unlike {@code ReviewController},
 * which needed two different roles on different routes).
 */
@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class AdminController {

    private final AdminService adminService;
    private final UserRepository userRepository;
    private final PromptService promptService;
    private final AiGatewayService aiGatewayService;

    // Alphabetical rather than newest-first: this is a lookup table an admin scans for a
    // known name, not a feed. Explicit for the stable-pagination reason above either way.
    @GetMapping("/users")
    public ResponseEntity<Page<AdminUserDto>> users(@PageableDefault(size = 20, sort = "username") Pageable pageable) {
        return ResponseEntity.ok(adminService.getUsers(pageable));
    }

    // Phase 30.5 - lets the admin dashboard's Repeated Violations panel link through to a
    // flagged user's history. Reuses PromptService.getMyHistory verbatim (same
    // masked-text-only PromptHistoryItemDto a user gets for their own history) - the only
    // difference is the userId comes from the path instead of the caller's own JWT.
    @GetMapping("/users/{id}/history")
    public ResponseEntity<Page<PromptHistoryItemDto>> userHistory(@PathVariable Long id,
                                                                  @PageableDefault(size = 10, sort = "submittedAt",
                                                                          direction = Sort.Direction.DESC) Pageable pageable) {
        return ResponseEntity.ok(promptService.getMyHistory(id, pageable));
    }

    @PostMapping("/users/{id}/enable")
    public ResponseEntity<AdminUserDto> enableUser(@PathVariable Long id,
                                                      @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(adminService.setAccountStatus(id, AccountStatus.ACTIVE, adminId(userDetails)));
    }

    @PostMapping("/users/{id}/disable")
    public ResponseEntity<AdminUserDto> disableUser(@PathVariable Long id,
                                                       @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(adminService.setAccountStatus(id, AccountStatus.DISABLED, adminId(userDetails)));
    }

    @GetMapping("/policy")
    public ResponseEntity<AdminPolicyDto> getPolicy() {
        return ResponseEntity.ok(adminService.getPolicy());
    }

    @PutMapping("/policy")
    public ResponseEntity<AdminPolicyDto> updatePolicy(@Valid @RequestBody AdminPolicyDto request,
                                                          @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(adminService.updatePolicy(request, adminId(userDetails)));
    }

    @GetMapping("/org-terms")
    public ResponseEntity<List<OrgTermDto>> getOrgTerms() {
        return ResponseEntity.ok(adminService.getOrgTerms());
    }

    @PostMapping("/org-terms")
    public ResponseEntity<OrgTermDto> addOrgTerm(@Valid @RequestBody OrgTermCreateRequest request,
                                                    @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(adminService.addOrgTerm(request.term(), adminId(userDetails)));
    }

    @DeleteMapping("/org-terms/{id}")
    public ResponseEntity<Void> deleteOrgTerm(@PathVariable Long id, @AuthenticationPrincipal UserDetails userDetails) {
        adminService.deleteOrgTerm(id, adminId(userDetails));
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/approved-models")
    public ResponseEntity<List<ApprovedModelDto>> getApprovedModels() {
        return ResponseEntity.ok(adminService.getApprovedModels());
    }

    @PostMapping("/approved-models")
    public ResponseEntity<ApprovedModelDto> addApprovedModel(@Valid @RequestBody ApprovedModelCreateRequest request,
                                                                 @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(adminService.addApprovedModel(request.modelName(), adminId(userDetails)));
    }

    @PutMapping("/approved-models/{id}")
    public ResponseEntity<ApprovedModelDto> updateApprovedModel(@PathVariable Long id,
                                                                    @Valid @RequestBody ApprovedModelUpdateRequest request,
                                                                    @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(adminService.updateApprovedModel(id, request.active(), adminId(userDetails)));
    }

    // 32.2 - lets the Model Configuration page show a live Online/Unavailable indicator
    // without sending an actual chat prompt through the gateway.
    @GetMapping("/ollama-status")
    public ResponseEntity<OllamaStatusDto> ollamaStatus() {
        return ResponseEntity.ok(new OllamaStatusDto(aiGatewayService.isReachable()));
    }

    @GetMapping("/retention")
    public ResponseEntity<RetentionDto> getRetention() {
        return ResponseEntity.ok(adminService.getRetention());
    }

    @PutMapping("/retention")
    public ResponseEntity<RetentionDto> updateRetention(@Valid @RequestBody RetentionDto request,
                                                           @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(adminService.updateRetention(request.retentionDays(), adminId(userDetails)));
    }

    private Long adminId(UserDetails userDetails) {
        User admin = userRepository.findByUsername(userDetails.getUsername())
                .orElseThrow(() -> new NoSuchElementException("User not found"));
        return admin.getId();
    }
}
