package com.screener.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Generic key/value store backing the various admin-configurable settings referenced
 * across todo.md (max prompt length 7.2, per-detector toggles 9.6, policy thresholds
 * and policy_version 20.3, retention days 20.6) — none of which had a dedicated table
 * from Phase 2.2's entity list. Added here since 7.2 is the first task that needs it.
 */
@Entity
@Table(name = "system_config")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class SystemConfig {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "config_key", unique = true)
    private String configKey;

    @Column(name = "config_value")
    private String configValue;
}
