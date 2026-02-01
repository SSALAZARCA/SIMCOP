package com.simcop.repository;

import com.simcop.model.IntelligenceReport;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface IntelligenceReportRepository extends JpaRepository<IntelligenceReport, String> {
}
