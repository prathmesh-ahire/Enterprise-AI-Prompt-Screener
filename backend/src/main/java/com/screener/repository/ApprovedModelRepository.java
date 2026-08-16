package com.screener.repository;

import com.screener.model.ApprovedModel;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ApprovedModelRepository extends JpaRepository<ApprovedModel, Long> {
}
