package com.screener.service;

import com.screener.detection.DetectionEngine;
import com.screener.detection.PolicyDecisionEngine;
import com.screener.dto.AdminPolicyDto;
import com.screener.dto.AdminUserDto;
import com.screener.dto.ApprovedModelDto;
import com.screener.dto.OrgTermDto;
import com.screener.model.AccountStatus;
import com.screener.model.ApprovedModel;
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
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

import java.time.LocalDateTime;
import java.util.List;
import java.util.NoSuchElementException;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AdminServiceTest {

    @Mock private UserRepository userRepository;
    @Mock private UserRoleRepository userRoleRepository;
    @Mock private RoleRepository roleRepository;
    @Mock private SystemConfigRepository systemConfigRepository;
    @Mock private OrgConfidentialTermRepository orgConfidentialTermRepository;
    @Mock private ApprovedModelRepository approvedModelRepository;
    @Mock private AuditService auditService;

    private AdminService adminService;

    private static final Long ADMIN_ID = 1L;

    @BeforeEach
    void setUp() {
        adminService = new AdminService(userRepository, userRoleRepository, roleRepository,
                systemConfigRepository, orgConfidentialTermRepository, approvedModelRepository, auditService);
        lenient().when(systemConfigRepository.findByConfigKey(anyString())).thenReturn(Optional.empty());
    }

    @Test
    void getUsersResolvesRolesPerUser() {
        User user = new User();
        user.setId(2L);
        user.setUsername("alice");
        user.setEmail("alice@example.com");
        user.setAccountStatus(AccountStatus.ACTIVE);
        user.setCreatedAt(LocalDateTime.now());

        UserRole userRole = new UserRole();
        userRole.setUserId(2L);
        userRole.setRoleId(10L);
        Role role = new Role();
        role.setId(10L);
        role.setName("USER");

        Pageable pageable = PageRequest.of(0, 20);
        when(userRepository.findAll(pageable)).thenReturn(new PageImpl<>(List.of(user), pageable, 1));
        when(userRoleRepository.findByUserId(2L)).thenReturn(List.of(userRole));
        when(roleRepository.findById(10L)).thenReturn(Optional.of(role));

        Page<AdminUserDto> result = adminService.getUsers(pageable);

        assertEquals(1, result.getTotalElements());
        assertEquals(List.of("USER"), result.getContent().get(0).roles());
    }

    @Test
    void setAccountStatusDisablesAndLogsAudit() {
        User user = new User();
        user.setId(2L);
        user.setUsername("alice");
        user.setAccountStatus(AccountStatus.ACTIVE);
        when(userRepository.findById(2L)).thenReturn(Optional.of(user));
        lenient().when(userRoleRepository.findByUserId(2L)).thenReturn(List.of());

        AdminUserDto result = adminService.setAccountStatus(2L, AccountStatus.DISABLED, ADMIN_ID);

        assertEquals("DISABLED", result.accountStatus());
        verify(auditService).log(eq(ADMIN_ID), eq("ADMIN_USER_DISABLED"), eq(null), eq(null));
    }

    @Test
    void setAccountStatusThrowsWhenUserNotFound() {
        when(userRepository.findById(99L)).thenReturn(Optional.empty());
        assertThrows(NoSuchElementException.class,
                () -> adminService.setAccountStatus(99L, AccountStatus.DISABLED, ADMIN_ID));
    }

    @Test
    void getPolicyReturnsDefaultsWhenNothingConfigured() {
        AdminPolicyDto policy = adminService.getPolicy();

        assertEquals(2000, policy.maxPromptLength());
        assertTrue(policy.disabledDetectors().isEmpty());
        assertEquals(25, policy.maskThreshold());
        assertEquals(50, policy.confirmThreshold());
        assertEquals(65, policy.reviewThreshold());
        assertEquals(75, policy.blockThreshold());
        assertEquals(1, policy.policyVersion());
    }

    @Test
    void updatePolicyPersistsEveryFieldAndIncrementsPolicyVersion() {
        when(systemConfigRepository.findByConfigKey(anyString())).thenReturn(Optional.empty());

        AdminPolicyDto request = new AdminPolicyDto(3000, List.of("PERSONAL_EMAIL"), 20, 45, 60, 80, null);
        adminService.updatePolicy(request, ADMIN_ID);

        ArgumentCaptor<SystemConfig> captor = ArgumentCaptor.forClass(SystemConfig.class);
        verify(systemConfigRepository, times(7)).save(captor.capture());
        List<SystemConfig> saved = captor.getAllValues();

        assertTrue(saved.stream().anyMatch(c -> c.getConfigKey().equals("max_prompt_length") && c.getConfigValue().equals("3000")));
        assertTrue(saved.stream().anyMatch(c -> c.getConfigKey().equals(DetectionEngine.DISABLED_DETECTORS_CONFIG_KEY)
                && c.getConfigValue().equals("PERSONAL_EMAIL")));
        assertTrue(saved.stream().anyMatch(c -> c.getConfigKey().equals(PolicyDecisionEngine.BLOCK_THRESHOLD_KEY)
                && c.getConfigValue().equals("80")));
        assertTrue(saved.stream().anyMatch(c -> c.getConfigKey().equals("policy_version") && c.getConfigValue().equals("2")));

        verify(auditService).log(eq(ADMIN_ID), eq("ADMIN_POLICY_UPDATED"), eq(null), eq(null));
    }

    @Test
    void updatePolicyRejectsAnUnknownDetectorName() {
        AdminPolicyDto request = new AdminPolicyDto(2000, List.of("NOT_A_REAL_DETECTOR"), 25, 50, 65, 75, null);
        assertThrows(IllegalArgumentException.class, () -> adminService.updatePolicy(request, ADMIN_ID));
    }

    @Test
    void updatePolicyRejectsNonAscendingThresholds() {
        AdminPolicyDto request = new AdminPolicyDto(2000, List.of(), 50, 40, 65, 75, null);
        assertThrows(IllegalArgumentException.class, () -> adminService.updatePolicy(request, ADMIN_ID));
    }

    @Test
    void addOrgTermSetsAddedByAndActiveTrue() {
        OrgTermDto result = adminService.addOrgTerm("Project Phoenix", ADMIN_ID);

        assertEquals("Project Phoenix", result.term());
        assertEquals(ADMIN_ID, result.addedBy());
        assertTrue(result.active());
        verify(auditService).log(eq(ADMIN_ID), eq("ADMIN_ORG_TERM_ADDED"), eq(null), eq(null));
    }

    @Test
    void deleteOrgTermThrowsWhenNotFound() {
        when(orgConfidentialTermRepository.existsById(5L)).thenReturn(false);
        assertThrows(NoSuchElementException.class, () -> adminService.deleteOrgTerm(5L, ADMIN_ID));
    }

    @Test
    void deleteOrgTermDeletesAndLogsWhenFound() {
        when(orgConfidentialTermRepository.existsById(5L)).thenReturn(true);
        adminService.deleteOrgTerm(5L, ADMIN_ID);
        verify(orgConfidentialTermRepository).deleteById(5L);
        verify(auditService).log(eq(ADMIN_ID), eq("ADMIN_ORG_TERM_DELETED"), eq(null), eq(null));
    }

    @Test
    void addApprovedModelDefaultsToActive() {
        ApprovedModelDto result = adminService.addApprovedModel("llama3.2", ADMIN_ID);
        assertEquals("llama3.2", result.modelName());
        assertTrue(result.active());
    }

    @Test
    void updateApprovedModelTogglesActiveFlag() {
        ApprovedModel model = new ApprovedModel();
        model.setId(7L);
        model.setModelName("llama3.2");
        model.setActive(true);
        when(approvedModelRepository.findById(7L)).thenReturn(Optional.of(model));

        ApprovedModelDto result = adminService.updateApprovedModel(7L, false, ADMIN_ID);

        assertEquals(false, result.active());
        verify(auditService).log(eq(ADMIN_ID), eq("ADMIN_MODEL_DEACTIVATED"), eq(null), eq(null));
    }

    @Test
    void updateApprovedModelThrowsWhenNotFound() {
        when(approvedModelRepository.findById(99L)).thenReturn(Optional.empty());
        assertThrows(NoSuchElementException.class, () -> adminService.updateApprovedModel(99L, true, ADMIN_ID));
    }

    @Test
    void getRetentionReturnsDefaultWhenNotConfigured() {
        assertEquals(90, adminService.getRetention().retentionDays());
    }

    @Test
    void updateRetentionPersistsAndLogs() {
        adminService.updateRetention(30, ADMIN_ID);

        ArgumentCaptor<SystemConfig> captor = ArgumentCaptor.forClass(SystemConfig.class);
        verify(systemConfigRepository).save(captor.capture());
        assertEquals("retention_days", captor.getValue().getConfigKey());
        assertEquals("30", captor.getValue().getConfigValue());
        verify(auditService).log(eq(ADMIN_ID), eq("ADMIN_RETENTION_UPDATED"), eq(null), eq(null));
    }
}
