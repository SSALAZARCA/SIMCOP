package com.simcop.controller;

import com.simcop.model.*;
import com.simcop.model.embeddable.GeoLocation;
import com.simcop.service.UAVService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/uav")
@CrossOrigin(origins = "*")
public class UAVController {

    @Autowired
    private UAVService uavService;

    @GetMapping("/available-support")
    public List<MilitaryUnit> getAvailableSupport(@RequestParam double lat, @RequestParam double lon,
            @RequestParam String type) {
        return uavService.findAvailableUAVSupport(lat, lon, type);
    }

    @PostMapping("/request-support")
    public UAVMission requestSupport(@RequestBody UAVMissionRequest request) {
        return uavService.requestSupport(
                request.getRequesterId(),
                request.getDroneUnitId(),
                UAVMissionType.valueOf(request.getType()),
                request.getTarget(),
                request.getDetails());
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
    public void receiveTelemetry(@RequestBody com.simcop.dto.UAVTelemetryDTO telemetry) {
        uavService.processTelemetry(telemetry);
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
