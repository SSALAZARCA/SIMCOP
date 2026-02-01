package com.simcop.repository;

import com.simcop.model.AfterActionReport;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface AfterActionReportRepository extends JpaRepository<AfterActionReport, String> {
}
