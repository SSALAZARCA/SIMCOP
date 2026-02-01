package com.simcop.controller;

import com.simcop.model.Alert;
import com.simcop.repository.AlertRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/alerts")
public class AlertController {

    @Autowired
    private AlertRepository repository;

    @GetMapping
    public List<Alert> getAllAlerts() {
        return repository.findAll();
    }

    @PostMapping
    public Alert createAlert(@RequestBody Alert alert) {
        return repository.save(alert);
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
