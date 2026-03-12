package com.simcop.controller;

import com.simcop.model.Soldier;
import com.simcop.service.SoldierService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.transaction.annotation.Transactional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.List;

@RestController
@RequestMapping("/api/soldiers")
@Transactional
public class SoldierController {

    private static final Logger logger = LoggerFactory.getLogger(SoldierController.class);

    @Autowired
    private SoldierService soldierService;

    @Autowired
    private com.simcop.service.VisibilityService visibilityService;

    @GetMapping
    public List<Soldier> getAllSoldiers(@RequestHeader(value = "Authorization", required = false) String token) {
        if (token == null) return new java.util.ArrayList<>();
        
        com.simcop.model.User user = visibilityService.getUserFromToken(token);
        if (user == null) return new java.util.ArrayList<>();

        List<Soldier> allSoldiers = soldierService.getAllSoldiers();

        // Superadmin and National View see everyone
        if (user.getRole() == com.simcop.model.UserRole.ADMINISTRATOR || 
            user.getRole() == com.simcop.model.UserRole.COMANDANTE_EJERCITO ||
            (user.getPermissions() != null && (user.getPermissions().contains("NATIONAL_VIEW") || user.getPermissions().contains("VISTA_NACIONAL")))) {
            return allSoldiers;
        }

        // Logic: Filter soldiers belonging to units they can see
        List<com.simcop.model.MilitaryUnit> visibleUnits = visibilityService.getVisibleUnits(user);
        java.util.Set<String> visibleUnitIds = new java.util.HashSet<>();
        for (com.simcop.model.MilitaryUnit u : visibleUnits) {
            visibleUnitIds.add(u.getId());
        }

        java.util.List<Soldier> visibleSoldiers = new java.util.ArrayList<>();
        for (Soldier s : allSoldiers) {
            if (s.getUnit() != null && visibleUnitIds.contains(s.getUnit().getId())) {
                visibleSoldiers.add(s);
            }
        }
        return visibleSoldiers;
    }

    @GetMapping("/{id}")
    public ResponseEntity<Soldier> getSoldierById(@PathVariable String id) {
        return soldierService.getSoldierById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/unit/{unitId}")
    public List<Soldier> getSoldiersByUnit(@PathVariable String unitId) {
        return soldierService.getSoldiersByUnit(unitId);
    }

    @PostMapping
    @org.springframework.security.access.prepost.PreAuthorize("hasAnyRole('ADMINISTRATOR', 'GESTOR_REPORTES', 'OFICIAL_LOGISTICA')")
    public ResponseEntity<Soldier> createSoldier(@RequestBody Soldier soldier,
            @RequestParam(required = false) String unitId) {
        try {
            Soldier saved = soldierService.createSoldier(soldier, unitId);
            logger.info("✅ Soldado creado: ID={}, Nombre={}", saved.getId(), saved.getFullName());
            return ResponseEntity.ok(saved);
        } catch (Exception e) {
            logger.error("❌ Error creando soldado: {}", e.getMessage());
            return ResponseEntity.badRequest().build();
        }
    }

    @PutMapping("/{id}")
    @org.springframework.security.access.prepost.PreAuthorize("hasAnyRole('ADMINISTRATOR', 'GESTOR_REPORTES', 'OFICIAL_LOGISTICA')")
    public ResponseEntity<Soldier> updateSoldier(@PathVariable String id, @RequestBody Soldier soldier) {
        try {
            Soldier updated = soldierService.updateSoldier(id, soldier);
            logger.info("✅ Soldado actualizado: ID={}", id);
            return ResponseEntity.ok(updated);
        } catch (Exception e) {
            logger.error("❌ Error actualizando soldado {}: {}", id, e.getMessage());
            return ResponseEntity.notFound().build();
        }
    }

    @DeleteMapping("/{id}")
    @org.springframework.security.access.prepost.PreAuthorize("hasRole('ADMINISTRATOR')")
    public ResponseEntity<Void> deleteSoldier(@PathVariable String id) {
        soldierService.deleteSoldier(id);
        return ResponseEntity.noContent().build();
    }
}
