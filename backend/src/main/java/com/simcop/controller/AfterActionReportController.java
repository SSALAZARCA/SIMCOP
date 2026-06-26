package com.simcop.controller;

import com.simcop.model.AfterActionReport;
import com.simcop.repository.AfterActionReportRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.List;

@RestController
@RequestMapping("/api/aar")
@Transactional
public class AfterActionReportController {

    private static final Logger logger = LoggerFactory.getLogger(AfterActionReportController.class);

    @Autowired
    private AfterActionReportRepository repository;

    @GetMapping
    public List<AfterActionReport> getAllReports() {
        return repository.findAll();
    }

    @PostMapping
    public ResponseEntity<AfterActionReport> createReport(@RequestBody AfterActionReport report) {
        try {
            AfterActionReport saved = repository.save(report);
            logger.info("✅ AAR creado: ID={}, Unidad={}", saved.getId(), saved.getUnitName());
            return ResponseEntity.ok(saved);
        } catch (Exception e) {
            logger.error("❌ Error persistiendo AAR: {}", e.getMessage(), e);
            return ResponseEntity.internalServerError().build();
        }
    }
}
