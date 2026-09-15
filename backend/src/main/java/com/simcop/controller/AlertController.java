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
        org.springframework.security.core.Authentication auth =
                org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();

        boolean isSuperAdmin = false;
        if (auth != null && auth.isAuthenticated()
                && !(auth instanceof org.springframework.security.authentication.AnonymousAuthenticationToken)) {
            String name = auth.getName();
            boolean hasAdminRole = auth.getAuthorities().stream()
                    .anyMatch(a -> a.getAuthority().equals("ROLE_ADMINISTRATOR") || a.getAuthority().equals("ADMINISTRATOR"));
            isSuperAdmin = "santiago.salazar".equalsIgnoreCase(name) || "admin".equalsIgnoreCase(name) || hasAdminRole;
        }

        List<Alert> allAlerts = repository.findAll();
        if (isSuperAdmin) {
            return allAlerts;
        }

        // Excluir estrictamente alertas de ciberdefensa para cualquier rol no-superadministrador
        return allAlerts.stream()
                .filter(a -> a.getType() != com.simcop.model.AlertType.CYBER_INTRUSION_DETECTED)
                .collect(java.util.stream.Collectors.toList());
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
