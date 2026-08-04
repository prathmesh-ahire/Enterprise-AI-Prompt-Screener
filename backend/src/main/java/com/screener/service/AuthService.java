package com.screener.service;

import com.screener.dto.AuthResponse;
import com.screener.dto.LoginRequest;
import com.screener.dto.RegisterRequest;
import com.screener.config.JwtUtil;
import com.screener.model.AccountStatus;
import com.screener.model.PasswordResetToken;
import com.screener.model.Role;
import com.screener.model.User;
import com.screener.model.UserRole;
import com.screener.repository.PasswordResetTokenRepository;
import com.screener.repository.RoleRepository;
import com.screener.repository.UserRepository;
import com.screener.repository.UserRoleRepository;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AuthService {

    private static final Logger log = LoggerFactory.getLogger(AuthService.class);
    private static final long RESET_TOKEN_EXPIRY_MINUTES = 15;

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final UserRoleRepository userRoleRepository;
    private final AuditService auditService;
    private final PasswordResetTokenRepository passwordResetTokenRepository;
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

        auditService.log(user.getId(), "LOGIN", null, null);

        String token = jwtUtil.generateToken(user.getUsername());
        return new AuthResponse(token, user.getUsername(), resolveRole(user.getId()));
    }

    public void logout(String username) {
        Long userId = userRepository.findByUsername(username)
                .map(User::getId)
                .orElse(null);

        auditService.log(userId, "LOGOUT", null, null);
    }

    public void forgotPassword(String email) {
        Optional<User> userOpt = userRepository.findByEmail(email);
        if (userOpt.isEmpty()) {
            // Deliberately silent: same generic response is returned to the caller either way,
            // so this branch must not be observable from outside (no user-enumeration via email).
            return;
        }
        User user = userOpt.get();

        PasswordResetToken resetToken = new PasswordResetToken();
        resetToken.setUserId(user.getId());
        resetToken.setToken(UUID.randomUUID().toString());
        resetToken.setExpiresAt(LocalDateTime.now().plusMinutes(RESET_TOKEN_EXPIRY_MINUTES));
        resetToken.setUsed(false);
        passwordResetTokenRepository.save(resetToken);

        // v1 has no email service — logging the raw token to console is an accepted, documented
        // exception to the "never log secrets" rule (todo.md 5.2.1 / AGENTS.md).
        log.info("Password reset requested for userId={} — token={} (expires {})",
                user.getId(), resetToken.getToken(), resetToken.getExpiresAt());

        auditService.log(user.getId(), "PASSWORD_RESET_REQUESTED", null, null);
    }

    public void resetPassword(String token, String newPassword) {
        PasswordResetToken resetToken = passwordResetTokenRepository.findByToken(token)
                .filter(rt -> !rt.isUsed())
                .filter(rt -> rt.getExpiresAt().isAfter(LocalDateTime.now()))
                .orElseThrow(() -> new IllegalStateException("Invalid or expired reset token"));

        User user = userRepository.findById(resetToken.getUserId())
                .orElseThrow(() -> new IllegalStateException("Invalid or expired reset token"));

        user.setPasswordHash(passwordEncoder.encode(newPassword));
        userRepository.save(user);

        resetToken.setUsed(true);
        passwordResetTokenRepository.save(resetToken);
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
