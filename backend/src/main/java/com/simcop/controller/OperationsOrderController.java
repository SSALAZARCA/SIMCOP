package com.simcop.controller;

import com.simcop.model.OperationsOrder;
import com.simcop.repository.OperationsOrderRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.transaction.annotation.Transactional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.List;

@RestController
@RequestMapping("/api/ordop")
@Transactional
public class OperationsOrderController {

    private static final Logger logger = LoggerFactory.getLogger(OperationsOrderController.class);

    @Autowired
    private OperationsOrderRepository repository;

    @GetMapping
    public List<OperationsOrder> getAllOrders() {
        return repository.findAll();
    }

    @PostMapping
    public ResponseEntity<OperationsOrder> createOrder(@RequestBody OperationsOrder order) {
        try {
            OperationsOrder saved = repository.save(order);
            logger.info("✅ Orden de Operaciones creada: ID={}, Título={}", saved.getId(), saved.getTitle());
            return ResponseEntity.ok(saved);
        } catch (Exception e) {
            logger.error("❌ Error persistiendo orden de operaciones: {}", e.getMessage());
            return ResponseEntity.internalServerError().build();
        }
    }

    @GetMapping("/{id}")
    public ResponseEntity<OperationsOrder> getOrderById(@PathVariable String id) {
        return repository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }
}
