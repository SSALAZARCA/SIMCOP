package com.simcop.controller;

import com.simcop.model.IntelligenceReport;
import com.simcop.repository.IntelligenceReportRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import org.springframework.transaction.annotation.Transactional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import java.util.List;

@RestController
@RequestMapping("/api/intel")
@Transactional
public class IntelligenceReportController {

    private static final Logger logger = LoggerFactory.getLogger(IntelligenceReportController.class);

    @Autowired
    private IntelligenceReportRepository repository;

    @Autowired
    private com.simcop.service.VisibilityService visibilityService;

    @GetMapping
    public List<IntelligenceReport> getAllReports(
            @RequestHeader(value = "Authorization", required = false) String token) {
        if (token == null)
            return List.of();

        com.simcop.model.User user = visibilityService.getUserFromToken(token);
        if (user == null)
            return List.of();

        // Admin/Army Commander see all
        if (user.getRole() == com.simcop.model.UserRole.ADMINISTRATOR ||
                user.getRole() == com.simcop.model.UserRole.COMANDANTE_EJERCITO) {
            return repository.findAll();
        }

        // Optimized check: Filter by visible units first in DB
        List<com.simcop.model.MilitaryUnit> visibleUnits = visibilityService.getVisibleUnits(user);
        List<String> visibleUnitIds = visibleUnits.stream().map(u -> u.getId()).toList();
        
        String preloadedAo = visibilityService.getPreloadedAoForUser(user);

        return repository.findByReportingUnitIdIn(visibleUnitIds).stream()
                .filter(r -> visibilityService.isLocationVisibleWithPreloadedAo(r.getLocation(), user, preloadedAo))
                .toList();
    }

    @PostMapping
    @org.springframework.security.access.prepost.PreAuthorize("hasAnyRole('ADMINISTRATOR', 'GESTOR_REPORTES', 'COMANDANTE_BATALLON', 'COMANDANTE_BRIGADA', 'COMANDANTE_DIVISION', 'COMANDANTE_EJERCITO', 'COMANDANTE_OBSERVADOR_ADELANTADO')")
    public ResponseEntity<IntelligenceReport> createReport(@RequestBody IntelligenceReport report,
            @RequestHeader(value = "Authorization", required = false) String token) {
        if (token == null)
            return ResponseEntity.status(401).build();

        com.simcop.model.User user = visibilityService.getUserFromToken(token);
        if (user == null)
            return ResponseEntity.status(401).build();

        // Verify user has unit
        if (user.getAssignedUnitId() != null) {
            report.setReportingUnitId(user.getAssignedUnitId());
        } else if (user.getRole() != com.simcop.model.UserRole.ADMINISTRATOR) {
            // Non-admins must have a unit to file reports properly
            // For now we allow it but log warning or leave null?
            // Requirement says "user of intel adequated so creation is assigned to a unit"
            // If user has no unit, we can't assign one.
        }
        
        try {
            IntelligenceReport saved = repository.save(report);
            logger.info("✅ Reporte de Inteligencia creado: ID={}, Título={}, Usuario={}", saved.getId(), saved.getTitle(), user.getUsername());
            return ResponseEntity.ok(saved);
        } catch (Exception e) {
            logger.error("❌ Error persistiendo reporte de inteligencia: {}", e.getMessage(), e);
            return ResponseEntity.internalServerError().build();
        }
    }

    @PutMapping("/{id}/link/{otherId}")
    @org.springframework.security.access.prepost.PreAuthorize("hasAnyRole('ADMINISTRATOR', 'GESTOR_REPORTES')")
    public ResponseEntity<Void> linkReports(@PathVariable @org.springframework.lang.NonNull String id,
            @PathVariable @org.springframework.lang.NonNull String otherId) {
        IntelligenceReport reportA = repository.findById(id).orElse(null);
        IntelligenceReport reportB = repository.findById(otherId).orElse(null);

        if (reportA == null || reportB == null) {
            return ResponseEntity.notFound().build();
        }

        if (!reportA.getRelatedReportIds().contains(otherId)) {
            reportA.getRelatedReportIds().add(otherId);
        }
        if (!reportB.getRelatedReportIds().contains(id)) {
            reportB.getRelatedReportIds().add(id);
        }

        try {
            repository.save(reportA);
            repository.save(reportB);
            logger.info("✅ Reportes vinculados: {} <-> {}", id, otherId);
        } catch (Exception e) {
            logger.error("❌ Error vinculando reportes {} y {}: {}", id, otherId, e.getMessage());
            return ResponseEntity.internalServerError().build();
        }
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/{id}/link/{otherId}")
    @org.springframework.security.access.prepost.PreAuthorize("hasAnyRole('ADMINISTRATOR', 'GESTOR_REPORTES')")
    public ResponseEntity<Void> unlinkReports(@PathVariable @org.springframework.lang.NonNull String id,
            @PathVariable @org.springframework.lang.NonNull String otherId) {
        IntelligenceReport reportA = repository.findById(id).orElse(null);
        IntelligenceReport reportB = repository.findById(otherId).orElse(null);

        if (reportA == null || reportB == null) {
            return ResponseEntity.notFound().build();
        }

        reportA.getRelatedReportIds().remove(otherId);
        reportB.getRelatedReportIds().remove(id);

        repository.save(reportA);
        repository.save(reportB);
        return ResponseEntity.ok().build();
    }
}
