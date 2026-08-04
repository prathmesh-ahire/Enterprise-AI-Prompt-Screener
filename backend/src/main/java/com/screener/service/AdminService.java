package com.screener.service;

import com.screener.detection.DetectionEngine;
import com.screener.detection.PolicyDecisionEngine;
import com.screener.dto.AdminPolicyDto;
import com.screener.dto.AdminUserDto;
import com.screener.dto.ApprovedModelDto;
import com.screener.dto.OrgTermDto;
import com.screener.dto.RetentionDto;
import com.screener.model.AccountStatus;
import com.screener.model.ApprovedModel;
import com.screener.model.EntityType;
import com.screener.model.OrgConfidentialTerm;
import com.screener.model.Role;
import com.screener.model.SystemConfig;
import com.screener.model.User;
import com.screener.model.UserRole;
import com.screener.repository.ApprovedModelRepository;
import com.screener.repository.OrgConfidentialTermRepository;
import com.screener.repository.RoleRepository;
import com.screener.repository.SystemConfigRepository;
import com.screener.repository.UserRepository;
import com.screener.repository.UserRoleRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.List;
import java.util.NoSuchElementException;
import java.util.Optional;

/**
 * Backs every {@code /api/admin/**} route (todo.md Phase 20). Reads/writes the exact same
 * {@code system_config} keys {@code DetectionEngine}/{@code PromptService}/
 * {@code PolicyDecisionEngine} already consult, so a PUT here changes real screening
 * behaviour immediately rather than being decorative.
 */
@Service
@RequiredArgsConstructor
public class AdminService {

    private final UserRepository userRepository;
    private final UserRoleRepository userRoleRepository;
    private final RoleRepository roleRepository;
    private final SystemConfigRepository systemConfigRepository;
    private final OrgConfidentialTermRepository orgConfidentialTermRepository;
    private final ApprovedModelRepository approvedModelRepository;
    private final AuditService auditService;

    // 20.2
    public Page<AdminUserDto> getUsers(Pageable pageable) {
        return userRepository.findAll(pageable).map(this::toUserDto);
    }

    public AdminUserDto setAccountStatus(Long userId, AccountStatus status, Long adminId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new NoSuchElementException("User not found"));
        user.setAccountStatus(status);
        userRepository.save(user);
        auditService.log(adminId, "ADMIN_USER_" + status.name(), null, null);
        return toUserDto(user);
    }

    // 20.3
    public AdminPolicyDto getPolicy() {
        return new AdminPolicyDto(
                resolveInt(PromptService.MAX_LENGTH_CONFIG_KEY, PromptService.DEFAULT_MAX_LENGTH),
                resolveDisabledDetectors(),
                resolveInt(PolicyDecisionEngine.MASK_THRESHOLD_KEY, PolicyDecisionEngine.DEFAULT_MASK_THRESHOLD),
                resolveInt(PolicyDecisionEngine.CONFIRM_THRESHOLD_KEY, PolicyDecisionEngine.DEFAULT_CONFIRM_THRESHOLD),
                resolveInt(PolicyDecisionEngine.REVIEW_THRESHOLD_KEY, PolicyDecisionEngine.DEFAULT_REVIEW_THRESHOLD),
                resolveInt(PolicyDecisionEngine.BLOCK_THRESHOLD_KEY, PolicyDecisionEngine.DEFAULT_BLOCK_THRESHOLD),
                resolveInt(PromptService.POLICY_VERSION_CONFIG_KEY, PromptService.DEFAULT_POLICY_VERSION));
    }

    public AdminPolicyDto updatePolicy(AdminPolicyDto request, Long adminId) {
        validateDisabledDetectors(request.disabledDetectors());
        validateAscendingThresholds(request);

        saveConfig(PromptService.MAX_LENGTH_CONFIG_KEY, String.valueOf(request.maxPromptLength()));
        List<String> disabled = request.disabledDetectors() == null ? List.of() : request.disabledDetectors();
        saveConfig(DetectionEngine.DISABLED_DETECTORS_CONFIG_KEY, String.join(",", disabled));
        saveConfig(PolicyDecisionEngine.MASK_THRESHOLD_KEY, String.valueOf(request.maskThreshold()));
        saveConfig(PolicyDecisionEngine.CONFIRM_THRESHOLD_KEY, String.valueOf(request.confirmThreshold()));
        saveConfig(PolicyDecisionEngine.REVIEW_THRESHOLD_KEY, String.valueOf(request.reviewThreshold()));
        saveConfig(PolicyDecisionEngine.BLOCK_THRESHOLD_KEY, String.valueOf(request.blockThreshold()));

        int newVersion = resolveInt(PromptService.POLICY_VERSION_CONFIG_KEY, PromptService.DEFAULT_POLICY_VERSION) + 1;
        saveConfig(PromptService.POLICY_VERSION_CONFIG_KEY, String.valueOf(newVersion));

        auditService.log(adminId, "ADMIN_POLICY_UPDATED", null, null);
        return getPolicy();
    }

    // 20.4
    public List<OrgTermDto> getOrgTerms() {
        return orgConfidentialTermRepository.findAll().stream().map(this::toTermDto).toList();
    }

    public OrgTermDto addOrgTerm(String term, Long adminId) {
        OrgConfidentialTerm entity = new OrgConfidentialTerm();
        entity.setTerm(term);
        entity.setAddedBy(adminId);
        entity.setActive(true);
        orgConfidentialTermRepository.save(entity);
        auditService.log(adminId, "ADMIN_ORG_TERM_ADDED", null, null);
        return toTermDto(entity);
    }

    public void deleteOrgTerm(Long id, Long adminId) {
        if (!orgConfidentialTermRepository.existsById(id)) {
            throw new NoSuchElementException("Org confidential term not found");
        }
        orgConfidentialTermRepository.deleteById(id);
        auditService.log(adminId, "ADMIN_ORG_TERM_DELETED", null, null);
    }

    // 20.5
    public List<ApprovedModelDto> getApprovedModels() {
        return approvedModelRepository.findAll().stream().map(this::toModelDto).toList();
    }

    public ApprovedModelDto addApprovedModel(String modelName, Long adminId) {
        ApprovedModel model = new ApprovedModel();
        model.setModelName(modelName);
        model.setActive(true);
        model.setAddedAt(LocalDateTime.now());
        approvedModelRepository.save(model);
        auditService.log(adminId, "ADMIN_MODEL_ADDED", null, null);
        return toModelDto(model);
    }

    public ApprovedModelDto updateApprovedModel(Long id, boolean active, Long adminId) {
        ApprovedModel model = approvedModelRepository.findById(id)
                .orElseThrow(() -> new NoSuchElementException("Approved model not found"));
        model.setActive(active);
        approvedModelRepository.save(model);
        auditService.log(adminId, active ? "ADMIN_MODEL_ACTIVATED" : "ADMIN_MODEL_DEACTIVATED", null, null);
        return toModelDto(model);
    }

    // 20.6
    public RetentionDto getRetention() {
        return new RetentionDto(resolveInt(RetentionCleanupJob.RETENTION_DAYS_KEY, RetentionCleanupJob.DEFAULT_RETENTION_DAYS));
    }

    public RetentionDto updateRetention(int retentionDays, Long adminId) {
        saveConfig(RetentionCleanupJob.RETENTION_DAYS_KEY, String.valueOf(retentionDays));
        auditService.log(adminId, "ADMIN_RETENTION_UPDATED", null, null);
        return getRetention();
    }

    private void validateDisabledDetectors(List<String> disabledDetectors) {
        if (disabledDetectors == null) {
            return;
        }
        for (String name : disabledDetectors) {
            EntityType.valueOf(name);
        }
    }

    private void validateAscendingThresholds(AdminPolicyDto request) {
        boolean ascending = request.maskThreshold() < request.confirmThreshold()
                && request.confirmThreshold() < request.reviewThreshold()
                && request.reviewThreshold() < request.blockThreshold();
        if (!ascending) {
            throw new IllegalArgumentException(
                    "Thresholds must be strictly increasing: maskThreshold < confirmThreshold < reviewThreshold < blockThreshold");
        }
    }

    private List<String> resolveDisabledDetectors() {
        return systemConfigRepository.findByConfigKey(DetectionEngine.DISABLED_DETECTORS_CONFIG_KEY)
                .map(SystemConfig::getConfigValue)
                .filter(value -> !value.isBlank())
                .map(value -> Arrays.stream(value.split(",")).map(String::trim).toList())
                .orElse(List.of());
    }

    private int resolveInt(String key, int defaultValue) {
        return systemConfigRepository.findByConfigKey(key)
                .map(SystemConfig::getConfigValue)
                .map(Integer::parseInt)
                .orElse(defaultValue);
    }

    private void saveConfig(String key, String value) {
        SystemConfig config = systemConfigRepository.findByConfigKey(key).orElseGet(SystemConfig::new);
        config.setConfigKey(key);
        config.setConfigValue(value);
        systemConfigRepository.save(config);
    }

    private AdminUserDto toUserDto(User user) {
        List<String> roles = userRoleRepository.findByUserId(user.getId()).stream()
                .map(UserRole::getRoleId)
                .map(roleRepository::findById)
                .flatMap(Optional::stream)
                .map(Role::getName)
                .toList();
        return new AdminUserDto(user.getId(), user.getUsername(), user.getEmail(), roles,
                user.getAccountStatus().name(), user.getCreatedAt());
    }

    private OrgTermDto toTermDto(OrgConfidentialTerm term) {
        return new OrgTermDto(term.getId(), term.getTerm(), term.getAddedBy(), term.isActive());
    }

    private ApprovedModelDto toModelDto(ApprovedModel model) {
        return new ApprovedModelDto(model.getId(), model.getModelName(), model.isActive(), model.getAddedAt());
    }
}
