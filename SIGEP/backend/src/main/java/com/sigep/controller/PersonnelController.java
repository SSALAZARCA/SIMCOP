package com.sigep.controller;

import com.sigep.model.Soldier;
import com.sigep.repository.SoldierRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.time.LocalDateTime;
import java.util.UUID;
import com.sigep.model.Novedad;
import com.sigep.repository.NovedadRepository;

@RestController
@RequestMapping("/api/personnel")
public class PersonnelController {

    @Autowired
    private SoldierRepository soldierRepository;

    @Autowired
    private NovedadRepository novedadRepository;

    @Autowired
    private com.sigep.security.UnitSecurityService unitSecurityService;

    @GetMapping
    public List<Soldier> getAll(org.springframework.security.core.Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            return soldierRepository.findAll();
        }
        String role = authentication.getAuthorities().isEmpty() ? "" : 
                authentication.getAuthorities().iterator().next().getAuthority();
        String assignedUnitId = authentication.getDetails() instanceof String ? 
                (String) authentication.getDetails() : null;

        if (unitSecurityService.isNationalScope(role, assignedUnitId)) {
            return soldierRepository.findAll();
        }

        java.util.Set<String> accessibleUnits = unitSecurityService.getAccessibleUnitIds(role, assignedUnitId);
        return soldierRepository.findAll().stream()
                .filter(s -> s.getUnitId() != null && 
                        (accessibleUnits.contains(s.getUnitId()) || 
                         accessibleUnits.contains(unitSecurityService.normalizeUnitId(s.getUnitId()))))
                .toList();
    }
    
    @GetMapping("/unit/{unitId}")
    public ResponseEntity<List<Soldier>> getByUnit(@PathVariable String unitId, org.springframework.security.core.Authentication authentication) {
        if (authentication != null && !unitSecurityService.isUnitAuthorized(authentication, unitId)) {
            return ResponseEntity.status(org.springframework.http.HttpStatus.FORBIDDEN).build();
        }
        String normalizedTarget = unitSecurityService.normalizeUnitId(unitId);
        List<Soldier> unitSoldiers = soldierRepository.findAll().stream()
            .filter(s -> unitId.equals(s.getUnitId()) || (normalizedTarget != null && normalizedTarget.equals(unitSecurityService.normalizeUnitId(s.getUnitId()))))
            .toList();
        return ResponseEntity.ok(unitSoldiers);
    }

    @PostMapping
    public ResponseEntity<Soldier> create(@RequestBody Soldier soldier) {
        if (soldier.getId() == null || soldier.getId().isEmpty()) {
            soldier.setId(UUID.randomUUID().toString());
        }
        if (soldier.getStatus() == null) soldier.setStatus("ACTIVE");
        if (soldier.getAssignmentDate() == null) soldier.setAssignmentDate(java.time.LocalDate.now());
        if (soldier.getHealthStatus() == null) soldier.setHealthStatus("APTO");
        return ResponseEntity.ok(soldierRepository.save(soldier));
    }

    @Transactional
    @PostMapping("/batch")
    public ResponseEntity<List<Soldier>> createBatch(@RequestBody List<Soldier> soldiers) {
        List<Soldier> saved = soldiers.stream().map(s -> {
            if (s.getId() == null || s.getId().trim().isEmpty()) {
                s.setId(UUID.randomUUID().toString());
            }
            if (s.getStatus() == null || s.getStatus().trim().isEmpty()) {
                s.setStatus("ACTIVE");
            }
            if (s.getAssignmentDate() == null) {
                s.setAssignmentDate(java.time.LocalDate.now());
            }
            if (s.getHealthStatus() == null || s.getHealthStatus().trim().isEmpty()) {
                s.setHealthStatus("APTO");
            }
            if (s.getTimeInPosition() == null) {
                s.setTimeInPosition(0);
            }
            return soldierRepository.save(s);
        }).toList();
        return ResponseEntity.ok(saved);
    }
    
    @Transactional
    @PostMapping("/novedades")
    public ResponseEntity<Novedad> registerNovedad(@RequestBody Novedad novedad) {
        novedad.setFecha(LocalDateTime.now());
        
        // Logica para aplicar la novedad al soldado (ej. si es BAJA, cambiar status)
        soldierRepository.findById(novedad.getSoldierId()).ifPresent(soldier -> {
            if ("BAJA".equals(novedad.getTipo()) || "TRASLADO".equals(novedad.getTipo())) {
                soldier.setStatus("INACTIVE");
            } else if ("LICENCIA_MEDICA".equals(novedad.getTipo())) {
                soldier.setHealthStatus("EXCUSA MEDICA");
            }
            soldierRepository.save(soldier);
        });
        
        return ResponseEntity.ok(novedadRepository.save(novedad));
    }
    
    @GetMapping("/unit/{unitId}/novedades")
    public ResponseEntity<List<Novedad>> getUnitNovedades(@PathVariable String unitId) {
        return ResponseEntity.ok(novedadRepository.findByUnitIdOrderByFechaDesc(unitId));
    }
}
