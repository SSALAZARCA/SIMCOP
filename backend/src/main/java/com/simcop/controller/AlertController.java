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

    @Autowired
    private com.simcop.repository.MilitaryUnitRepository militaryUnitRepository;

    @Autowired
    private com.simcop.service.WhatsAppService whatsAppService;

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

            // Notificación WhatsApp
            try {
                if (saved.getType() == com.simcop.model.AlertType.CYBER_INTRUSION_DETECTED) {
                    whatsAppService.notifyCyberAlert(saved);
                } else if (saved.getType() == com.simcop.model.AlertType.UNIT_ENGAGED) {
                    if (saved.getUnitId() != null && !saved.getUnitId().trim().isEmpty()) {
                        militaryUnitRepository.findById(saved.getUnitId()).ifPresent(unit -> {
                            whatsAppService.notifyCombatEngagement(unit, saved.getMessage());
                        });
                    } else {
                        whatsAppService.broadcastTacticalAlert("UNIDAD EN COMBATE", saved.getMessage(), "CRÍTICA");
                    }
                } else if (saved.getSeverity() == com.simcop.model.AlertSeverity.CRITICAL || saved.getSeverity() == com.simcop.model.AlertSeverity.HIGH) {
                    whatsAppService.broadcastTacticalAlert(saved.getType() != null ? saved.getType().name() : "ALERTA TÁCTICA", saved.getMessage(), saved.getSeverity().name());
                }
            } catch (Exception e) {
                logger.error("Error al notificar alerta por WhatsApp: {}", e.getMessage());
            }

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
