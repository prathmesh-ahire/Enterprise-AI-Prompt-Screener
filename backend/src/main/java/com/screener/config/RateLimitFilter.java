package com.screener.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Component;
import org.springframework.util.AntPathMatcher;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * Simple in-memory fixed-window rate limiter — no external dependency (todo.md 6.1's
 * zero-dependency option). Two independent limits: per-user on prompt submission endpoints,
 * per-IP on unauthenticated auth endpoints (which have no user to key on yet).
 */
@Component
public class RateLimitFilter extends OncePerRequestFilter {

    private static final Logger log = LoggerFactory.getLogger(RateLimitFilter.class);

    private static final AntPathMatcher PATH_MATCHER = new AntPathMatcher();
    private static final long WINDOW_MS = 60_000L;

    private static final List<String> PROMPT_PATTERNS = List.of(
            "/api/prompts/submit",
            "/api/prompts/*/confirm"
    );

    private static final List<String> AUTH_PATTERNS = List.of(
            "/api/auth/login",
            "/api/auth/register",
            "/api/auth/forgot-password",
            "/api/auth/reset-password"
    );

    private final ConcurrentHashMap<String, Window> windows = new ConcurrentHashMap<>();

    @Value("${app.rate-limit.prompt-per-minute:10}")
    private int promptLimitPerMinute;

    @Value("${app.rate-limit.auth-per-minute:5}")
    private int authLimitPerMinute;

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                     HttpServletResponse response,
                                     FilterChain filterChain) throws ServletException, IOException {
        String path = request.getRequestURI();

        if ("POST".equalsIgnoreCase(request.getMethod())) {
            if (matchesAny(PROMPT_PATTERNS, path)) {
                String username = currentUsername();
                if (username != null && !tryConsume("prompt:" + username, promptLimitPerMinute)) {
                    log.warn("Rate limit exceeded for prompt submissions by user {}", username);
                    respondTooManyRequests(response, "Too many prompt submissions. Please wait a minute and try again.");
                    return;
                }
            } else if (matchesAny(AUTH_PATTERNS, path)) {
                String clientIp = request.getRemoteAddr();
                if (!tryConsume("auth:" + clientIp, authLimitPerMinute)) {
                    log.warn("Rate limit exceeded for auth endpoint {} from {}", path, clientIp);
                    respondTooManyRequests(response, "Too many attempts from this address. Please wait a minute and try again.");
                    return;
                }
            }
        }

        filterChain.doFilter(request, response);
    }

    private boolean matchesAny(List<String> patterns, String path) {
        return patterns.stream().anyMatch(pattern -> PATH_MATCHER.match(pattern, path));
    }

    private String currentUsername() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null && authentication.isAuthenticated()
                && authentication.getPrincipal() instanceof UserDetails userDetails) {
            return userDetails.getUsername();
        }
        return null;
    }

    private boolean tryConsume(String key, int limit) {
        Window window = windows.computeIfAbsent(key, k -> new Window());
        synchronized (window) {
            long now = System.currentTimeMillis();
            if (now - window.windowStart >= WINDOW_MS) {
                window.windowStart = now;
                window.count.set(0);
            }
            return window.count.incrementAndGet() <= limit;
        }
    }

    private void respondTooManyRequests(HttpServletResponse response, String message) throws IOException {
        response.setStatus(429);
        response.setContentType("application/json");
        response.getWriter().write("{\"message\":\"" + message + "\",\"status\":429}");
    }

    private static final class Window {
        volatile long windowStart = System.currentTimeMillis();
        final AtomicInteger count = new AtomicInteger(0);
    }
}
