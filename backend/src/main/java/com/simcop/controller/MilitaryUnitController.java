package com.simcop.controller;

import com.simcop.model.MilitaryUnit;
import com.simcop.model.UnitStatus;
import com.simcop.model.embeddable.GeoLocation;
import com.simcop.model.embeddable.RoutePoint;
import com.simcop.repository.MilitaryUnitRepository;
import com.simcop.dto.SpotReportDTO;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.ArrayList;

@RestController
@RequestMapping("/api/units")
@Transactional
public class MilitaryUnitController {

    private static final Logger logger = LoggerFactory.getLogger(MilitaryUnitController.class);

    @Autowired
    private MilitaryUnitRepository repository;

    @Autowired
    private com.simcop.service.VisibilityService visibilityService;

    @GetMapping
    public List<MilitaryUnit> getAllUnits(@RequestHeader(value = "Authorization", required = false) String token) {
        if (token == null) {
            logger.warn("⚠️ Intento de acceso a unidades sin token");
            return new ArrayList<>();
        }

        com.simcop.model.User user = visibilityService.getUserFromToken(token);
        if (user == null) {
            logger.error("❌ Usuario no encontrado para el token proporcionado");
            return new ArrayList<>();
        }

        logger.info("🔍 Filtrando unidades para usuario: {} (Rol: {})", user.getUsername(), user.getRole());
        
        // Superadmin always sees everything
        if (user.getRole() == com.simcop.model.UserRole.ADMINISTRATOR || 
            user.getRole() == com.simcop.model.UserRole.COMANDANTE_EJERCITO) {
            logger.info("✅ Acceso total concedido por rol administrativo");
            return repository.findAll();
        }

        return visibilityService.getVisibleUnits(user);
    }

    @GetMapping("/{id}")
    public ResponseEntity<MilitaryUnit> getUnitById(@PathVariable String id) {
        return repository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public MilitaryUnit createUnit(@RequestBody MilitaryUnit unit) {
        logger.info("📦 Iniciando creación de unidad: {} (ID: {})", unit.getName(), unit.getId());
        try {
            MilitaryUnit saved = repository.save(unit);
            logger.info("✅ Unidad guardada exitosamente: {} (UUID: {})", saved.getName(), saved.getId());
            return saved;
        } catch (Exception e) {
            logger.error("❌ Error persistiendo unidad {}: {}", unit.getName(), e.getMessage());
            throw e;
        }
    }

    @PutMapping("/{id}")
    @org.springframework.security.access.prepost.PreAuthorize("hasAnyRole('ADMINISTRATOR', 'COMANDANTE_BATALLON', 'COMANDANTE_BRIGADA', 'COMANDANTE_DIVISION', 'COMANDANTE_EJERCITO')")
    public ResponseEntity<MilitaryUnit> updateUnit(@PathVariable String id, @RequestBody MilitaryUnit unitDetails) {
        logger.info("🔄 Solicitud de actualización para unidad ID: {}", id);
        return repository.findById(id)
                .map(unit -> {
                    try {
                        if (unitDetails.getName() != null) unit.setName(unitDetails.getName());
                        unit.setType(unitDetails.getType());
                        if (unitDetails.getCommander() != null) unit.setCommander(unitDetails.getCommander());
                        unit.setPersonnelBreakdown(unitDetails.getPersonnelBreakdown());
                        unit.setLocation(unitDetails.getLocation());
                        unit.setStatus(unitDetails.getStatus());
                        unit.setParentId(unitDetails.getParentId());
                        unit.setRetrainingFocus(unitDetails.getRetrainingFocus());
                        unit.setRetrainingDurationDays(unitDetails.getRetrainingDurationDays());
                        unit.setCurrentMission(unitDetails.getCurrentMission());
                        unit.setUnitSituationType(unitDetails.getUnitSituationType());

                        // Fields for Reports & Logistics
                        unit.setLastHourlyReportTimestamp(unitDetails.getLastHourlyReportTimestamp());
                        unit.setLastCommunicationTimestamp(unitDetails.getLastCommunicationTimestamp());
                        unit.setLastMovementTimestamp(unitDetails.getLastMovementTimestamp());
                        unit.setLastResupplyDate(unitDetails.getLastResupplyDate());
                        unit.setDaysOfSupply(unitDetails.getDaysOfSupply());
                        unit.setFuelLevel(unitDetails.getFuelLevel());
                        unit.setAmmoLevel(unitDetails.getAmmoLevel());

                        // Fields for Combat
                        unit.setCombatEndTimestamp(unitDetails.getCombatEndTimestamp());
                        unit.setCombatEndLocation(unitDetails.getCombatEndLocation());

                        // Fields for Retraining/Leave
                        unit.setLeaveStartDate(unitDetails.getLeaveStartDate());
                        unit.setLeaveDurationDays(unitDetails.getLeaveDurationDays());
                        unit.setRetrainingStartDate(unitDetails.getRetrainingStartDate());
                        unit.setToe(unitDetails.getToe());
                        unit.setAreaOfOperations(unitDetails.getAreaOfOperations());

                        // Fields for Route
                        if (unitDetails.getRouteHistory() != null) {
                            unit.getRouteHistory().clear();
                            unit.getRouteHistory().addAll(unitDetails.getRouteHistory());
                        }

                        MilitaryUnit updated = repository.save(unit);
                        logger.info("✅ Unidad ID: {} actualizada y persistida correctamente.", id);
                        return ResponseEntity.ok(updated);
                    } catch (Exception e) {
                        logger.error("❌ Fallo crítico al actualizar unidad ID {}: {}", id, e.getMessage());
                        throw e;
                    }
                })
                .orElseGet(() -> {
                    logger.warn("⚠️ Intento de actualización de unidad inexistente ID: {}", id);
                    return ResponseEntity.notFound().build();
                });
    }

    @DeleteMapping("/{id}")
    @org.springframework.security.access.prepost.PreAuthorize("hasRole('ADMINISTRATOR')")
    public ResponseEntity<Void> deleteUnit(@PathVariable String id) {
        if (repository.existsById(id)) {
            repository.deleteById(id);
            return ResponseEntity.ok().build();
        }
        return ResponseEntity.notFound().build();
    }

    @PostMapping("/{id}/spot")
    public ResponseEntity<MilitaryUnit> handleSpotReport(@PathVariable String id, @RequestBody SpotReportDTO report) {
        return repository.findById(id)
                .map(unit -> {
                    GeoLocation newLoc = new GeoLocation(report.getLat(), report.getLon());
                    unit.setLocation(newLoc);
                    unit.setLastMovementTimestamp(report.getTimestamp() != null ? report.getTimestamp() : System.currentTimeMillis());
                    unit.setLastCommunicationTimestamp(System.currentTimeMillis());
                    unit.setStatus(UnitStatus.MOVING);

                    // Add to route history
                    RoutePoint point = new RoutePoint();
                    point.setLat(report.getLat());
                    point.setLon(report.getLon());
                    point.setTimestamp(unit.getLastMovementTimestamp());
                    unit.getRouteHistory().add(point);

                    return ResponseEntity.ok(repository.save(unit));
                })
                .orElse(ResponseEntity.notFound().build());
    }
}
