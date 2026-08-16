package com.screener.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Table(name = "users")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // 42.4: uniqueness was enforced only by AuthService.register's existsByUsername check -
    // a classic check-then-insert race where two concurrent registrations for the same name
    // could both pass before either commits. The database is the only place that can settle
    // that. A duplicate insert now raises DataIntegrityViolationException, which
    // GlobalExceptionHandler already maps to 409 - the same status the application-level
    // check returns - so the API contract is unchanged either way.
    @Column(unique = true)
    private String username;

    private String email;

    private String passwordHash;

    @Enumerated(EnumType.STRING)
    private AccountStatus accountStatus;

    private LocalDateTime createdAt;
}
