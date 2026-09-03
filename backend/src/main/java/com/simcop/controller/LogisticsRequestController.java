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
@org.springframework.security.access.prepost.PreAuthorize("isAuthenticated()")
public class LogisticsRequestController {

    private static final Logger logger = LoggerFactory.getLogger(LogisticsRequestController.class);

    @Autowired
    private LogisticsRequestRepository repository;

    @GetMapping
    public List<LogisticsRequest> getAllRequests() {
        return repository.findAll();
    }

    @PostMapping
    @org.springframework.security.access.prepost.PreAuthorize("hasAnyRole('ADMINISTRATOR', 'OFICIAL_LOGISTICA', 'COMANDANTE_EJERCITO', 'COMANDANTE_DIVISION', 'COMANDANTE_BRIGADA', 'COMANDANTE_BATALLON', 'COMANDANTE_COMPANIA', 'COMANDANTE_PELOTON')")
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
    @org.springframework.security.access.prepost.PreAuthorize("hasAnyRole('ADMINISTRATOR', 'OFICIAL_LOGISTICA', 'COMANDANTE_EJERCITO', 'COMANDANTE_DIVISION', 'COMANDANTE_BRIGADA', 'COMANDANTE_BATALLON', 'COMANDANTE_COMPANIA', 'COMANDANTE_PELOTON')")
    public ResponseEntity<LogisticsRequest> updateRequest(@PathVariable String id,
            @RequestBody LogisticsRequest requestDetails) {
        return repository.findById(id)
                .map(request -> {
                    org.springframework.security.core.Authentication auth = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
                    String currentUsername = (auth != null && auth.isAuthenticated() && !auth.getName().equals("anonymousUser")) ? auth.getName() : "system";

                    request.setStatus(requestDetails.getStatus());
                    if ("FULFILLED".equalsIgnoreCase(requestDetails.getStatus())) {
                        request.setFulfilledTimestamp(requestDetails.getFulfilledTimestamp() != null ? requestDetails.getFulfilledTimestamp() : System.currentTimeMillis());
                        request.setFulfilledByUserId(currentUsername);
                    } else {
                        request.setFulfilledTimestamp(requestDetails.getFulfilledTimestamp());
                        request.setFulfilledByUserId(requestDetails.getFulfilledByUserId());
                    }
                    return ResponseEntity.ok(repository.save(request));
                })
                .orElse(ResponseEntity.notFound().build());
    }
}
