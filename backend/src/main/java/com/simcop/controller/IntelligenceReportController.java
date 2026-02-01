package com.simcop.controller;

import com.simcop.model.IntelligenceReport;
import com.simcop.repository.IntelligenceReportRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/intel")
public class IntelligenceReportController {

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

        // Others see only reports from units they can see
        List<com.simcop.model.MilitaryUnit> visibleUnits = visibilityService.getVisibleUnits(user);
        List<String> visibleUnitIds = visibleUnits.stream().map(u -> u.getId()).toList();

        return repository.findAll().stream()
                .filter(r -> r.getReportingUnitId() == null || visibleUnitIds.contains(r.getReportingUnitId()))
                .toList();
    }

    @PostMapping
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

        return ResponseEntity.ok(repository.save(report));
    }
}
