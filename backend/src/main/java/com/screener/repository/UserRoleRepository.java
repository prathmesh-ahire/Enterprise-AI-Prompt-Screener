package com.screener.repository;

import com.screener.model.UserRole;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface UserRoleRepository extends JpaRepository<UserRole, Long> {
    List<UserRole> findByUserId(Long userId);

    // resolving a caller's role used to fetch their UserRole rows and then issue a
    // separate findById per row - a textbook N+1 on the prompt-submission hot path. One join
    // returns the names directly. Multi-root rather than a relationship because UserRole holds
    // plain Long foreign keys by design, same shape as the other joins here.
    @Query("SELECT r.name FROM UserRole ur, Role r WHERE r.id = ur.roleId AND ur.userId = :userId")
    List<String> findRoleNamesByUserId(@Param("userId") Long userId);
}
