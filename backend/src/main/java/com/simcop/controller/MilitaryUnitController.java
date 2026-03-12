package com.simcop.controller;

import com.simcop.model.MilitaryUnit;
import com.simcop.model.UnitStatus;
import com.simcop.model.embeddable.GeoLocation;
import com.simcop.model.embeddable.RoutePoint;
import com.simcop.repository.MilitaryUnitRepository;
import com.simcop.dto.SpotReportDTO;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/units")
public class MilitaryUnitController {

    @Autowired
    private MilitaryUnitRepository repository;

    @Autowired
    private com.simcop.service.VisibilityService visibilityService;

    @GetMapping
    public List<MilitaryUnit> getAllUnits(@RequestHeader(value = "Authorization", required = false) String token) {
        if (token == null) {
            // If no token (should be handled by security, but just in case), return empty
            // or all?
            // SecurityConfig requires auth for /api/** so this is just failsafe
            return List.of();
        }

        com.simcop.model.User user = visibilityService.getUserFromToken(token);
        if (user == null) {
            return List.of();
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
    @org.springframework.security.access.prepost.PreAuthorize("hasAnyRole('ADMINISTRATOR', 'COMANDANTE_EJERCITO', 'COMANDANTE_DIVISION', 'COMANDANTE_BRIGADA', 'COMANDANTE_BATALLON', 'OFICIAL_INTELIGENCIA')")
    public MilitaryUnit createUnit(@RequestBody MilitaryUnit unit) {
        return repository.save(unit);
    }

    @PutMapping("/{id}")
    @org.springframework.security.access.prepost.PreAuthorize("hasAnyRole('ADMINISTRATOR', 'COMANDANTE_BATALLON', 'COMANDANTE_BRIGADA', 'COMANDANTE_DIVISION', 'COMANDANTE_EJERCITO')")
    public ResponseEntity<MilitaryUnit> updateUnit(@PathVariable String id, @RequestBody MilitaryUnit unitDetails) {
        return repository.findById(id)
                .map(unit -> {
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

                    return ResponseEntity.ok(repository.save(unit));
                })
                .orElse(ResponseEntity.notFound().build());
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
