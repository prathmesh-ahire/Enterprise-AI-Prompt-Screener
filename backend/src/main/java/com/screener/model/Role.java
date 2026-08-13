package com.screener.model;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.Collection;
import java.util.List;

@Entity
@Table(name = "roles")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class Role {

    // Phase 41.2: the single answer to "which role wins when a user holds more than one".
    // Two callers need it and must never disagree: AuthService (the role in the login
    // response, which drives the navbar, route guards and post-login landing page) and
    // PromptService (policyContextScore's role baseline, 11.1.4). They used to answer it
    // two different ways - AuthService took whichever role the repository happened to
    // return first - which was harmless only while every account held exactly one role.
    // Phase 41.3 gives the admin a second role, so this had to be settled first.
    public static final List<String> PRIORITY = List.of("ADMIN", "REVIEWER", "USER");
    public static final String DEFAULT_ROLE = "USER";

    public static String mostPrivileged(Collection<String> roleNames) {
        return PRIORITY.stream().filter(roleNames::contains).findFirst().orElse(DEFAULT_ROLE);
    }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String name;
}
