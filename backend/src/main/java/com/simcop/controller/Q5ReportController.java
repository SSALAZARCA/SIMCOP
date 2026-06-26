package com.simcop.controller;

import com.simcop.model.Q5Report;
import com.simcop.repository.Q5ReportRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;
import org.springframework.transaction.annotation.Transactional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;

import java.util.List;

@RestController
@RequestMapping("/api/q5")
@Transactional
public class Q5ReportController {

    private static final Logger logger = LoggerFactory.getLogger(Q5ReportController.class);

    @Autowired
    private Q5ReportRepository repository;

    @GetMapping
    public List<Q5Report> getAllReports() {
        return repository.findAll();
    }

    @Autowired
    private com.simcop.service.TelegramService telegramService;

    @PostMapping
    public ResponseEntity<Q5Report> createReport(@RequestBody Q5Report report) {
        try {
            Q5Report saved = repository.save(report);
            logger.info("✅ Reporte Q5 creado: ID={}", saved.getId());
            return ResponseEntity.ok(saved);
        } catch (Exception e) {
            logger.error("❌ Error creando reporte Q5: {}", e.getMessage());
            return ResponseEntity.internalServerError().build();
        }
    }

    @PostMapping("/{id}/send")
    public org.springframework.http.ResponseEntity<?> sendReport(@PathVariable String id) {
        return repository.findById(id).map(report -> {
            boolean sent = telegramService.sendQ5Report(report);
            if (sent) {
                return org.springframework.http.ResponseEntity.ok().body("Report sent to Telegram");
            } else {
                return org.springframework.http.ResponseEntity.status(500).body("Failed to send report");
            }
        }).orElse(org.springframework.http.ResponseEntity.notFound().build());
    }
}
