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

    private void seedAdmin() {
        if (userRepository.existsByUsername(adminUsername)) {
            return;
        }
        Role adminRole = roleRepository.findByName("ADMIN")
                .orElseThrow(() -> new IllegalStateException("ADMIN role not seeded yet"));

        User admin = new User();
        admin.setUsername(adminUsername);
        admin.setEmail(adminEmail);
        admin.setPasswordHash(passwordEncoder.encode(adminPassword));
        admin.setAccountStatus(AccountStatus.ACTIVE);
        admin.setCreatedAt(LocalDateTime.now());
        admin = userRepository.save(admin);

        UserRole userRole = new UserRole();
        userRole.setUserId(admin.getId());
        userRole.setRoleId(adminRole.getId());
        userRoleRepository.save(userRole);
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
