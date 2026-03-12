package com.simcop.controller;

import com.simcop.model.FireMission;
import com.simcop.model.FireMissionStatus;
import com.simcop.service.FireMissionService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.transaction.annotation.Transactional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/fire-missions")
@Transactional
public class FireMissionController {

    private static final Logger logger = LoggerFactory.getLogger(FireMissionController.class);

    @Autowired
    private FireMissionService service;

    @GetMapping
    public List<FireMission> getAll() {
        return service.getAllMissions();
    }

    @PostMapping
    @org.springframework.security.access.prepost.PreAuthorize("hasAnyRole('ADMINISTRATOR', 'COMANDANTE_BATALLON', 'COMANDANTE_PIEZA_ARTILLERIA', 'COMANDANTE_OBSERVADOR_ADELANTADO')")
    public ResponseEntity<FireMission> create(@RequestBody FireMission mission) {
        try {
            FireMission saved = service.createMission(mission);
            logger.info("✅ Misión de fuego creada: ID={}, Artillería Asignada ID={}, Blanco={}", 
                saved.getId(), saved.getAssignedArtilleryId(), saved.getTargetLocation());
            return ResponseEntity.ok(saved);
        } catch (Exception e) {
            logger.error("❌ Error creando misión de fuego: {}", e.getMessage());
            return ResponseEntity.internalServerError().build();
        }
    }

    @PutMapping("/{id}/status")
    @org.springframework.security.access.prepost.PreAuthorize("hasAnyRole('ADMINISTRATOR', 'COMANDANTE_BATALLON', 'COMANDANTE_PIEZA_ARTILLERIA', 'DIRECTOR_TIRO_155', 'DIRECTOR_TIRO_M101A1', 'DIRECTOR_TIRO_LG1', 'DIRECTOR_TIRO_L119', 'DIRECTOR_TIRO_M120', 'DIRECTOR_TIRO_HY112', 'DIRECTOR_TIRO_MLRS')")
    public ResponseEntity<FireMission> updateStatus(@PathVariable String id, @RequestBody Map<String, String> body) {
        String statusStr = body.get("status");
        String reason = body.get("reason");

        try {
            FireMissionStatus status = FireMissionStatus.valueOf(statusStr);
            FireMission updated = service.updateStatus(id, status, reason);
            logger.info("✅ Estado de misión {} actualizado a {}: {}", id, status, reason);
            return ResponseEntity.ok(updated);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().build();
        }
    }

    @PutMapping("/{id}/assign")
    @org.springframework.security.access.prepost.PreAuthorize("hasAnyRole('ADMINISTRATOR', 'COMANDANTE_BATALLON', 'DIRECTOR_TIRO_155', 'DIRECTOR_TIRO_M101A1', 'DIRECTOR_TIRO_LG1', 'DIRECTOR_TIRO_L119', 'DIRECTOR_TIRO_M120', 'DIRECTOR_TIRO_HY112', 'DIRECTOR_TIRO_MLRS')")
    public ResponseEntity<FireMission> assignArtillery(@PathVariable String id, @RequestBody Map<String, String> body) {
        String artilleryId = body.get("artilleryId");
        if (artilleryId == null)
            return ResponseEntity.badRequest().build();

        return ResponseEntity.ok(service.assignArtillery(id, artilleryId));
    }
}
