package com.screener.config;

import com.screener.model.AccountStatus;
import com.screener.model.ApprovedModel;
import com.screener.model.Role;
import com.screener.model.User;
import com.screener.model.UserRole;
import com.screener.repository.ApprovedModelRepository;
import com.screener.repository.RoleRepository;
import com.screener.repository.UserRepository;
import com.screener.repository.UserRoleRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.List;

@Component
@RequiredArgsConstructor
public class DataSeeder implements CommandLineRunner {

    private static final List<String> ROLE_NAMES = List.of("USER", "REVIEWER", "ADMIN");

    private final RoleRepository roleRepository;
    private final UserRepository userRepository;
    private final UserRoleRepository userRoleRepository;
    private final ApprovedModelRepository approvedModelRepository;
    private final PasswordEncoder passwordEncoder;

    @Value("${app.admin.username}")
    private String adminUsername;

    @Value("${app.admin.password}")
    private String adminPassword;

    @Value("${app.admin.email}")
    private String adminEmail;

    @Value("${app.seed.default-model}")
    private String defaultModel;

    @Override
    public void run(String... args) {
        seedRoles();
        seedAdmin();
        seedApprovedModel();
    }

    private void seedRoles() {
        if (roleRepository.count() > 0) {
            return;
        }
        for (String name : ROLE_NAMES) {
            Role role = new Role();
            role.setName(name);
            roleRepository.save(role);
        }
    }

    // the admin holds USER in addition to ADMIN, because roles here are exclusive rather
    // than cumulative and PromptController/AuditController are @PreAuthorize("hasRole('USER')")
    // - so without it the seeded admin gets 403 on the Prompt and History pages the navbar
    // links them to. Granting USER widens nothing: ADMIN is already the most privileged role,
    // and PromptService.resolveRole still resolves this account to ADMIN, so
    // policyContextScore's role baseline is unchanged and no risk score moves.
    //
    // Role granting runs on every startup, not only when the admin row is first created: the
    // old version returned early whenever the username already existed, which would have left
    // every already-seeded database (i.e. the user's actual machine) without the new role and
    // made this fix look like it had done nothing.
    private void seedAdmin() {
        User admin = userRepository.findByUsername(adminUsername).orElseGet(this::createAdminUser);
        grantRoleIfMissing(admin, "ADMIN");
        grantRoleIfMissing(admin, "USER");
    }

    private User createAdminUser() {
        User admin = new User();
        admin.setUsername(adminUsername);
        admin.setEmail(adminEmail);
        admin.setPasswordHash(passwordEncoder.encode(adminPassword));
        admin.setAccountStatus(AccountStatus.ACTIVE);
        admin.setCreatedAt(LocalDateTime.now());
        return userRepository.save(admin);
    }

    private void grantRoleIfMissing(User user, String roleName) {
        Role role = roleRepository.findByName(roleName)
                .orElseThrow(() -> new IllegalStateException(roleName + " role not seeded yet"));
        boolean alreadyHeld = userRoleRepository.findByUserId(user.getId()).stream()
                .anyMatch(link -> role.getId().equals(link.getRoleId()));
        if (alreadyHeld) {
            return;
        }
        UserRole link = new UserRole();
        link.setUserId(user.getId());
        link.setRoleId(role.getId());
        userRoleRepository.save(link);
    }

    private void seedApprovedModel() {
        if (approvedModelRepository.count() > 0) {
            return;
        }
        ApprovedModel model = new ApprovedModel();
        model.setModelName(defaultModel);
        model.setActive(true);
        model.setAddedAt(LocalDateTime.now());
        approvedModelRepository.save(model);
    }
}
