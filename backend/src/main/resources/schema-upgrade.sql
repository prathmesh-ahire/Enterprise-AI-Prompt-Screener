-- ============================================================================
-- Schema upgrade for databases created before V1.1 (todo.md Phase 42.4 / 43.5)
--
-- WHY THIS FILE EXISTS
-- Hibernate runs with ddl-auto: update, which adds new tables and new columns but
-- will NOT add a unique constraint or an index to a column that already exists -
-- and it logs nothing when it declines. So the constraint on User.username and the
-- @Table(indexes = ...) declarations on the entities take effect only when Hibernate
-- creates those tables from scratch. A database that already exists never gets them.
--
-- Worse, the test suite cannot catch this: the H2 test profile uses ddl-auto:
-- create-drop, so it rebuilds the schema every run and every constraint IS applied
-- there. A green build is not evidence that the real database was changed.
--
-- WHO NEEDS TO RUN IT
--   * Anyone whose database predates V1.1 (run it once).
--   * Nobody else - a fresh `docker compose up` on an empty volume gets all of this
--     automatically from the entity annotations.
--
-- HOW TO RUN IT (PowerShell, from the project root)
--   $pw = (Get-Content .env | Select-String '^DB_PASSWORD=').ToString().Split('=',2)[1]
--   Get-Content backend\src\main\resources\schema-upgrade.sql | docker exec -i screener-mysql mysql -uroot -p"$pw" screener_db
--
-- It is safe to run more than once: every statement checks information_schema first
-- and skips anything already present. MySQL 8 has no CREATE INDEX IF NOT EXISTS,
-- which is why the checks are done by hand here.
--
-- AFTER RUNNING, VERIFY (do not trust a silent success):
--   SHOW INDEX FROM users;            -- expect uk_users_username
--   SHOW INDEX FROM prompt_requests;  -- expect idx_prompt_requests_*
-- ============================================================================

DELIMITER $$

-- Creates a plain (non-unique) index only if an index of that name is absent.
DROP PROCEDURE IF EXISTS add_index_if_missing$$
CREATE PROCEDURE add_index_if_missing(IN tbl VARCHAR(64), IN idx VARCHAR(64), IN cols VARCHAR(255))
BEGIN
    IF (SELECT COUNT(*) FROM information_schema.STATISTICS
        WHERE table_schema = DATABASE() AND table_name = tbl AND index_name = idx) = 0 THEN
        SET @ddl = CONCAT('CREATE INDEX ', idx, ' ON ', tbl, ' (', cols, ')');
        PREPARE stmt FROM @ddl;
        EXECUTE stmt;
        DEALLOCATE PREPARE stmt;
    END IF;
END$$

-- Creates a unique constraint only if absent, and only if the data actually permits
-- it - a duplicate would otherwise abort the whole script. Reports instead of failing.
DROP PROCEDURE IF EXISTS add_unique_if_missing$$
CREATE PROCEDURE add_unique_if_missing(IN tbl VARCHAR(64), IN idx VARCHAR(64), IN col VARCHAR(64))
BEGIN
    DECLARE dupes INT DEFAULT 0;

    IF (SELECT COUNT(*) FROM information_schema.STATISTICS
        WHERE table_schema = DATABASE() AND table_name = tbl AND index_name = idx) = 0 THEN

        SET @cnt = CONCAT('SELECT COUNT(*) INTO @dupe_count FROM (SELECT ', col,
                          ' FROM ', tbl, ' GROUP BY ', col, ' HAVING COUNT(*) > 1) d');
        PREPARE stmt FROM @cnt;
        EXECUTE stmt;
        DEALLOCATE PREPARE stmt;
        SET dupes = @dupe_count;

        IF dupes > 0 THEN
            SELECT CONCAT('SKIPPED ', tbl, '.', col, ': ', dupes,
                          ' duplicate value(s) present. Resolve them, then re-run this script.') AS warning;
        ELSE
            SET @ddl = CONCAT('ALTER TABLE ', tbl, ' ADD CONSTRAINT ', idx, ' UNIQUE (', col, ')');
            PREPARE stmt FROM @ddl;
            EXECUTE stmt;
            DEALLOCATE PREPARE stmt;
        END IF;
    END IF;
END$$

DELIMITER ;

-- ---------------------------------------------------------------------------
-- 42.4 - close the check-then-insert race on registration at the database level
-- ---------------------------------------------------------------------------
CALL add_unique_if_missing('users', 'uk_users_username', 'username');

-- ---------------------------------------------------------------------------
-- 43.5 - indexes, each backed by a real query in the code (no speculative ones).
-- Small, admin-curated tables (roles, system_config, org_confidential_terms,
-- approved_models) are deliberately left alone: MySQL scans a handful of rows
-- faster than it can consult an index, and every index costs write time.
-- ---------------------------------------------------------------------------

-- PromptRequestRepository.findByRequestId - every confirm, detail and review lookup
CALL add_index_if_missing('prompt_requests', 'idx_prompt_requests_request_id', 'request_id');
-- findByUserId(pageable) - the history page
CALL add_index_if_missing('prompt_requests', 'idx_prompt_requests_user_id', 'user_id');
-- findByStatusOrderBySubmittedAtAsc - the reviewer queue
CALL add_index_if_missing('prompt_requests', 'idx_prompt_requests_status', 'status');
-- findBySubmittedAtBefore - the nightly retention purge
CALL add_index_if_missing('prompt_requests', 'idx_prompt_requests_submitted_at', 'submitted_at');

-- findByRequestId / findByRequestIdIn / deleteByRequestIdIn
CALL add_index_if_missing('screening_decisions', 'idx_screening_decisions_request_id', 'request_id');
-- countByDecisionSince / countByDecisionBetween / processingTimeStatsBetween - the dashboard
CALL add_index_if_missing('screening_decisions', 'idx_screening_decisions_timestamp', 'timestamp');

-- findByRequestId, deleteByRequestIdIn, and the entity-stats join
CALL add_index_if_missing('detection_findings', 'idx_detection_findings_request_id', 'request_id');
CALL add_index_if_missing('risk_signals', 'idx_risk_signals_request_id', 'request_id');

-- countByUserIdAndActionInAndCreatedAtAfter - the repeated-attack-pattern check, which runs
-- on EVERY prompt submission, against the fastest-growing table in the schema. Composite so
-- one index serves both the user filter and the time window; its leftmost prefix also serves
-- findByUserId(pageable) for the audit page.
CALL add_index_if_missing('audit_events', 'idx_audit_events_user_created', 'user_id, created_at');
-- findUserIdsWithActionCountAtLeast - repeated violations, filters on created_at across all users
CALL add_index_if_missing('audit_events', 'idx_audit_events_created_at', 'created_at');

-- findRoleNamesByUserId - runs on every login and every prompt submission
CALL add_index_if_missing('user_roles', 'idx_user_roles_user_id', 'user_id');

DROP PROCEDURE add_index_if_missing;
DROP PROCEDURE add_unique_if_missing;

SELECT 'schema-upgrade.sql complete - verify with SHOW INDEX FROM users / prompt_requests' AS result;
