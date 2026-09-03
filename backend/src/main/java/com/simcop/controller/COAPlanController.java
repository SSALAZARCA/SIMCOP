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
@org.springframework.security.access.prepost.PreAuthorize("isAuthenticated()")
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
        org.springframework.security.core.Authentication auth = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.isAuthenticated()) {
            plan.setCreatedByUserId(auth.getName());
        }
        return service.create(plan);
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> updatePlan(@PathVariable String id, @RequestBody COAPlan plan) {
        Optional<COAPlan> existingOpt = service.getById(id);
        if (existingOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        COAPlan existing = existingOpt.get();
        org.springframework.security.core.Authentication auth = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
        boolean isAdmin = auth != null && auth.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_ADMINISTRATOR") || a.getAuthority().equals("ROLE_COMANDANTE_EJERCITO"));
        boolean isOwner = existing.getCreatedByUserId() != null && auth != null && existing.getCreatedByUserId().equalsIgnoreCase(auth.getName());

        if (!isAdmin && !isOwner) {
            return ResponseEntity.status(403).body("You do not have permission to modify this COA Plan.");
        }

        plan.setId(id);
        plan.setCreatedByUserId(existing.getCreatedByUserId());
        COAPlan updated = service.update(plan);
        return ResponseEntity.ok(updated);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deletePlan(@PathVariable String id) {
        Optional<COAPlan> existingOpt = service.getById(id);
        if (existingOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        COAPlan existing = existingOpt.get();
        org.springframework.security.core.Authentication auth = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
        boolean isAdmin = auth != null && auth.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_ADMINISTRATOR") || a.getAuthority().equals("ROLE_COMANDANTE_EJERCITO"));
        boolean isOwner = existing.getCreatedByUserId() != null && auth != null && existing.getCreatedByUserId().equalsIgnoreCase(auth.getName());

        if (!isAdmin && !isOwner) {
            return ResponseEntity.status(403).body("You do not have permission to delete this COA Plan.");
        }

        service.softDelete(id);
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/{id}/hard")
    @org.springframework.security.access.prepost.PreAuthorize("hasRole('ADMINISTRATOR')")
    public ResponseEntity<Void> hardDeletePlan(@PathVariable String id) {
        service.hardDelete(id);
        return ResponseEntity.ok().build();
    }
}
