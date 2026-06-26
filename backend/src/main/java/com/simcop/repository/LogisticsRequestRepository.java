package com.simcop.repository;

import com.simcop.model.LogisticsRequest;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface LogisticsRequestRepository extends JpaRepository<LogisticsRequest, String> {
}
