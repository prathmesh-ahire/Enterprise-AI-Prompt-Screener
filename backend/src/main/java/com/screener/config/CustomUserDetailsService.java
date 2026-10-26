package com.screener.config;

import com.screener.model.AccountStatus;
import com.screener.repository.UserRepository;
import com.screener.repository.UserRoleRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.DisabledException;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class CustomUserDetailsService implements UserDetailsService {

    private final UserRepository userRepository;
    private final UserRoleRepository userRoleRepository;

    @Override
    public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
        com.screener.model.User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new UsernameNotFoundException("User not found: " + username));

        if (user.getAccountStatus() != AccountStatus.ACTIVE) {
            throw new DisabledException("Account is disabled: " + username);
        }

        // one join instead of one query for the link rows plus one per role. This is the
        // highest-traffic instance of that N+1 in the project - JwtAuthFilter calls this on
        // EVERY authenticated request, not just prompt submissions.
        List<SimpleGrantedAuthority> authorities = userRoleRepository.findRoleNamesByUserId(user.getId()).stream()
                .map(name -> new SimpleGrantedAuthority("ROLE_" + name))
                .toList();

        return org.springframework.security.core.userdetails.User.builder()
                .username(user.getUsername())
                .password(user.getPasswordHash())
                .authorities(authorities)
                .build();
    }
}
