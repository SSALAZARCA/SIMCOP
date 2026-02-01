package com.simcop.controller;

import com.simcop.model.COAPlan;
import com.simcop.service.COAPlanService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api/coa-plans")
public class COAPlanController {

    @Autowired
    private COAPlanService service;

    @GetMapping
    public List<COAPlan> getAllPlans() {
        return service.getAllActive();
    }

    @GetMapping("/user/{userId}")
    public List<COAPlan> getPlansByUser(@PathVariable String userId) {
        return service.getActiveByUser(userId);
    }

    @GetMapping("/{id}")
    public ResponseEntity<COAPlan> getPlanById(@PathVariable String id) {
        Optional<COAPlan> plan = service.getById(id);
        return plan.map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public COAPlan createPlan(@RequestBody COAPlan plan) {
        return service.create(plan);
    }

    @PutMapping("/{id}")
    public ResponseEntity<COAPlan> updatePlan(@PathVariable String id, @RequestBody COAPlan plan) {
        plan.setId(id);
        COAPlan updated = service.update(plan);
        return ResponseEntity.ok(updated);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deletePlan(@PathVariable String id) {
        service.softDelete(id);
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/{id}/hard")
    public ResponseEntity<Void> hardDeletePlan(@PathVariable String id) {
        service.hardDelete(id);
        return ResponseEntity.ok().build();
    }
}
