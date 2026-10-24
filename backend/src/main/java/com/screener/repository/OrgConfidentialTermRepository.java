package com.screener.repository;

import com.screener.model.OrgConfidentialTerm;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface OrgConfidentialTermRepository extends JpaRepository<OrgConfidentialTerm, Long> {
    List<OrgConfidentialTerm> findByActiveTrue();

    boolean existsByTermIgnoreCaseAndActiveTrue(String term);
}
