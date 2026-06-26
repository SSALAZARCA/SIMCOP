package com.simcop.controller;

import com.simcop.model.LogisticsRequest;
import com.simcop.repository.LogisticsRequestRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.transaction.annotation.Transactional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.List;

@RestController
@RequestMapping("/api/logistics")
@Transactional
public class LogisticsRequestController {

    private static final Logger logger = LoggerFactory.getLogger(LogisticsRequestController.class);

    @Autowired
    private LogisticsRequestRepository repository;

    @GetMapping
    public List<LogisticsRequest> getAllRequests() {
        return repository.findAll();
    }

    @PostMapping
    public ResponseEntity<LogisticsRequest> createRequest(@RequestBody LogisticsRequest request) {
        try {
            LogisticsRequest saved = repository.save(request);
            logger.info("✅ Pedido Logístico creado: ID={}, Detalles={}", saved.getId(), saved.getDetails());
            return ResponseEntity.ok(saved);
        } catch (Exception e) {
            logger.error("❌ Error creando pedido logístico: {}", e.getMessage());
            return ResponseEntity.internalServerError().build();
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<LogisticsRequest> updateRequest(@PathVariable String id,
            @RequestBody LogisticsRequest requestDetails) {
        return repository.findById(id)
                .map(request -> {
                    request.setStatus(requestDetails.getStatus());
                    request.setFulfilledTimestamp(requestDetails.getFulfilledTimestamp());
                    request.setFulfilledByUserId(requestDetails.getFulfilledByUserId());
                    return ResponseEntity.ok(repository.save(request));
                })
                .orElse(ResponseEntity.notFound().build());
    }
}
