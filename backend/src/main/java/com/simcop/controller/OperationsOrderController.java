package com.simcop.controller;

import com.simcop.model.OperationsOrder;
import com.simcop.repository.OperationsOrderRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/ordop")
public class OperationsOrderController {

    @Autowired
    private OperationsOrderRepository repository;

    @GetMapping
    public List<OperationsOrder> getAllOrders() {
        return repository.findAll();
    }

    @PostMapping
    public OperationsOrder createOrder(@RequestBody OperationsOrder order) {
        return repository.save(order);
    }

    @GetMapping("/{id}")
    public ResponseEntity<OperationsOrder> getOrderById(@PathVariable String id) {
        return repository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }
}
