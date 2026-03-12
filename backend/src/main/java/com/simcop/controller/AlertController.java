package com.simcop.controller;

import com.simcop.model.Alert;
import com.simcop.repository.AlertRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.transaction.annotation.Transactional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.List;

@RestController
@RequestMapping("/api/alerts")
@Transactional
public class AlertController {

    private static final Logger logger = LoggerFactory.getLogger(AlertController.class);

    @Autowired
    private AlertRepository repository;

    @GetMapping
    public List<Alert> getAllAlerts() {
        return repository.findAll();
    }

    @PostMapping
    public ResponseEntity<Alert> createAlert(@RequestBody Alert alert) {
        try {
            Alert saved = repository.save(alert);
            logger.info("✅ Alerta creada: ID={}, Tipo={}", saved.getId(), saved.getType());
            return ResponseEntity.ok(saved);
        } catch (Exception e) {
            logger.error("❌ Error creando alerta: {}", e.getMessage());
            return ResponseEntity.internalServerError().build();
        }
    }

    @PutMapping("/{id}/acknowledge")
    public ResponseEntity<Alert> acknowledgeAlert(@PathVariable String id) {
        return repository.findById(id)
                .map(alert -> {
                    alert.setAcknowledged(true);
                    return ResponseEntity.ok(repository.save(alert));
                })
                .orElse(ResponseEntity.notFound().build());
    }
}
