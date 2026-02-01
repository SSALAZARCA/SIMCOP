package com.simcop.repository;

import com.simcop.model.Q5Report;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface Q5ReportRepository extends JpaRepository<Q5Report, String> {
}
