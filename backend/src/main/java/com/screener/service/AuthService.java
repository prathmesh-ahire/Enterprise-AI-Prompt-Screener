package com.screener.service;

import com.screener.dto.AuthResponse;
import com.screener.dto.LoginRequest;
import com.screener.dto.RegisterRequest;
import com.screener.config.JwtUtil;
import com.screener.model.AccountStatus;
import com.screener.model.AuditEvent;
import com.screener.model.Role;
import com.screener.model.User;
import com.screener.model.UserRole;
import com.screener.repository.AuditEventRepository;
import com.screener.repository.RoleRepository;
import com.screener.repository.UserRepository;
import com.screener.repository.UserRoleRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final UserRoleRepository userRoleRepository;
    private final AuditEventRepository auditEventRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final JwtUtil jwtUtil;

    public AuthResponse register(RegisterRequest request) {
        if (userRepository.existsByUsername(request.username())) {
            throw new IllegalStateException("Username is already taken");
        }

        Role userRole = roleRepository.findByName("USER")
                .orElseThrow(() -> new IllegalStateException("USER role not seeded"));

        User user = new User();
        user.setUsername(request.username());
        user.setEmail(request.email());
        user.setPasswordHash(passwordEncoder.encode(request.password()));
        user.setAccountStatus(AccountStatus.ACTIVE);
        user.setCreatedAt(LocalDateTime.now());
        user = userRepository.save(user);

        UserRole userRoleLink = new UserRole();
        userRoleLink.setUserId(user.getId());
        userRoleLink.setRoleId(userRole.getId());
        userRoleRepository.save(userRoleLink);

        String token = jwtUtil.generateToken(user.getUsername());
        return new AuthResponse(token, user.getUsername(), userRole.getName());
    }

    public AuthResponse login(LoginRequest request) {
        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.username(), request.password()));

        User user = userRepository.findByUsername(request.username())
                .orElseThrow(() -> new IllegalStateException("User not found after authentication"));

        String token = jwtUtil.generateToken(user.getUsername());
        return new AuthResponse(token, user.getUsername(), resolveRole(user.getId()));
    }

    public void logout(String username) {
        Long userId = userRepository.findByUsername(username)
                .map(User::getId)
                .orElse(null);

        AuditEvent event = new AuditEvent();
        event.setUserId(userId);
        event.setAction("LOGOUT");
        event.setCreatedAt(LocalDateTime.now());
        auditEventRepository.save(event);
    }

    private String resolveRole(Long userId) {
        return userRoleRepository.findByUserId(userId).stream()
                .map(UserRole::getRoleId)
                .map(roleRepository::findById)
                .flatMap(Optional::stream)
                .map(Role::getName)
                .findFirst()
                .orElse("USER");
    }
}
