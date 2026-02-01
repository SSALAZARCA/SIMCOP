package com.simcop.repository;

import com.simcop.model.COAPlan;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface COAPlanRepository extends JpaRepository<COAPlan, String> {

    // Find all active (not soft-deleted) plans
    List<COAPlan> findByHiddenTimestampIsNull();

    // Find active plans by creator
    List<COAPlan> findByCreatedByUserIdAndHiddenTimestampIsNull(String createdByUserId);

    // Find active plans ordered by creation date
    List<COAPlan> findByHiddenTimestampIsNullOrderByCreatedTimestampDesc();
}
