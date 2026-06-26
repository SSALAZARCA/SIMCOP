package com.simcop.controller;

import com.simcop.model.*;
import com.simcop.model.embeddable.GeoLocation;
import com.simcop.service.UAVService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;
import org.springframework.transaction.annotation.Transactional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;

import java.util.List;

@RestController
@RequestMapping("/api/uav")
@Transactional
public class UAVController {

    private static final Logger logger = LoggerFactory.getLogger(UAVController.class);

    @Autowired
    private UAVService uavService;

    @GetMapping("/available-support")
    public List<MilitaryUnit> getAvailableSupport(@RequestParam double lat, @RequestParam double lon,
            @RequestParam String type) {
        return uavService.findAvailableUAVSupport(lat, lon, type);
    }

    @PostMapping("/request-support")
    public ResponseEntity<com.simcop.model.UAVMission> requestSupport(@RequestBody UAVMissionRequest request) {
        try {
            com.simcop.model.UAVMission mission = uavService.requestSupport(
                    request.getRequesterId(),
                    request.getDroneUnitId(),
                    UAVMissionType.valueOf(request.getType()),
                    request.getTarget(),
                    request.getDetails());
            logger.info("✅ Misión UAV solicitada: ID={}, Tipo={}, Unidad={}", mission.getId(), mission.getType(), mission.getDroneUnitId());
            return ResponseEntity.ok(mission);
        } catch (Exception e) {
            logger.error("❌ Error solicitando apoyo UAV: {}", e.getMessage());
            return ResponseEntity.internalServerError().build();
        }
    }

    @GetMapping("/missions")
    public List<UAVMission> getMissions() {
        return uavService.getActiveMissions();
    }

    @PutMapping("/missions/{id}/status")
    public UAVMission updateStatus(@PathVariable String id, @RequestParam UAVMissionStatus status) {
        return uavService.updateMissionStatus(id, status);
    }

    @PostMapping("/assign-asset")
    public void assignAsset(@RequestParam String unitId, @RequestBody com.simcop.model.embeddable.UAVAsset asset) {
        uavService.assignAssetToUnit(unitId, asset);
    }

    @DeleteMapping("/asset")
    public void deleteAsset(@RequestParam String unitId, @RequestParam String assetId) {
        uavService.removeAssetFromUnit(unitId, assetId);
    }

    // Webhook for UAV Telemetry (Location, Battery, Stream URL updates)
    // Webhook for UAV Telemetry (Location, Battery, Stream URL updates)
    @PostMapping("/telemetry")
    public ResponseEntity<Void> receiveTelemetry(@RequestBody com.simcop.dto.UAVTelemetryDTO telemetry) {
        try {
            uavService.processTelemetry(telemetry);
            // Reducir ruido de logs para telemetría, solo errores o avisos críticos si fuera necesario
            return ResponseEntity.ok().build();
        } catch (Exception e) {
            logger.error("❌ Error procesando telemetría UAV {}: {}", telemetry.getUavId(), e.getMessage());
            return ResponseEntity.internalServerError().build();
        }
    }

    @GetMapping("/telemetry")
    public List<com.simcop.dto.UAVTelemetryDTO> getAllTelemetry() {
        return uavService.getAllUAVTelemetry();
    }

    // DTO for Request
    static class UAVMissionRequest {
        private String requesterId;
        private String droneUnitId;
        private String type;
        private GeoLocation target;
        private String details;

        public String getRequesterId() {
            return requesterId;
        }

        public void setRequesterId(String requesterId) {
            this.requesterId = requesterId;
        }

        public String getDroneUnitId() {
            return droneUnitId;
        }

        public void setDroneUnitId(String droneUnitId) {
            this.droneUnitId = droneUnitId;
        }

        public String getType() {
            return type;
        }

        public void setType(String type) {
            this.type = type;
        }

        public GeoLocation getTarget() {
            return target;
        }

        public void setTarget(GeoLocation target) {
            this.target = target;
        }

        public String getDetails() {
            return details;
        }

        public void setDetails(String details) {
            this.details = details;
        }
    }
}
