package com.simcop.service;

import com.simcop.model.*;
import com.simcop.model.embeddable.GeoLocation;
import com.simcop.model.embeddable.UAVAsset;
import com.simcop.repository.MilitaryUnitRepository;
import com.simcop.repository.UAVMissionRepository;
import com.simcop.dto.UAVTelemetryDTO;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.ArrayList;
import java.util.stream.Collectors;

@Service
public class UAVService {

    @Autowired
    private MilitaryUnitRepository unitRepository;

    @Autowired
    private UAVMissionRepository missionRepository;

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    // Calculate distance in KM (Haversine simplified)
    private double calculateDistance(double lat1, double lon1, double lat2, double lon2) {
        double R = 6371; // Earth radius in km
        double dLat = Math.toRadians(lat2 - lat1);
        double dLon = Math.toRadians(lon2 - lon1);
        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2)) *
                        Math.sin(dLon / 2) * Math.sin(dLon / 2);
        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }

    // Find available UAV assets near a location (for support request)
    public List<MilitaryUnit> findAvailableUAVSupport(double lat, double lon, String missionType) {
        List<MilitaryUnit> allUnits = unitRepository.findAll();
        List<MilitaryUnit> availableSupport = new ArrayList<>();

        for (MilitaryUnit unit : allUnits) {
            // Check if unit has UAV assets
            if (unit.getUavAssets() != null && !unit.getUavAssets().isEmpty()) {
                for (UAVAsset asset : unit.getUavAssets()) {
                    // Check type match (simplified logic: "STRIKE" needs ATTACK drone, "RECON"
                    // needs INTEL)
                    boolean typeMatch = false;
                    if (missionType.equals("STRIKE") && asset.getUavType().equals("ATTACK"))
                        typeMatch = true;
                    if (missionType.equals("RECON")
                            && (asset.getUavType().equals("INTEL") || asset.getUavType().equals("SPECIALIZED")))
                        typeMatch = true;

                    if (typeMatch && asset.getBatteryStatus() > 20.0) {
                        double dist = calculateDistance(unit.getLocation().getLat(), unit.getLocation().getLon(), lat,
                                lon);
                        if (dist <= asset.getOperationalRadius()) {
                            availableSupport.add(unit);
                            break; // Unit added once
                        }
                    }
                }
            }
        }
        return availableSupport;
    }

    public UAVMission requestSupport(String requesterId, String droneUnitId, UAVMissionType type, GeoLocation target,
            String details) {
        UAVMission mission = new UAVMission();
        mission.setRequesterUnitId(requesterId);
        mission.setDroneUnitId(droneUnitId);
        mission.setType(type);
        mission.setTargetLocation(target);
        mission.setDetails(details);
        mission.setStatus(UAVMissionStatus.REQUESTED);
        mission.setTimestamp(System.currentTimeMillis());
        return missionRepository.save(mission);
    }

    public List<UAVMission> getActiveMissions() {
        return missionRepository.findAll().stream()
                .filter(m -> m.getStatus() != UAVMissionStatus.COMPLETED && m.getStatus() != UAVMissionStatus.REJECTED)
                .collect(Collectors.toList());
    }

    public UAVMission updateMissionStatus(String missionId, UAVMissionStatus status) {
        if (missionId == null)
            return null;
        UAVMission m = missionRepository.findById(missionId).orElse(null);
        if (m != null) {
            m.setStatus(status);
            return missionRepository.save(m);
        }
        return null;
    }

    // Process incoming webhook telemetry
    public void processTelemetry(com.simcop.dto.UAVTelemetryDTO telemetry) {
        // Find units with UAV assets instead of all units
        List<MilitaryUnit> units = unitRepository.findUnitsWithUavs();
        for (MilitaryUnit unit : units) {
            boolean updated = false;
            for (UAVAsset asset : unit.getUavAssets()) {
                if (asset.getUavId().equals(telemetry.getUavId())) {
                    if (telemetry.getBatteryLevel() != null)
                        asset.setBatteryStatus(telemetry.getBatteryLevel());
                    if (telemetry.getStreamUrl() != null)
                        asset.setStreamUrl(telemetry.getStreamUrl());
                    if (telemetry.getLocation() != null)
                        asset.setLocation(telemetry.getLocation());
                    updated = true;
                }
            }
            if (updated) {
                unitRepository.save(unit);
                broadcastTelemetry(unit);
                break;
            }
        }
    }

    public void assignAssetToUnit(String unitId, UAVAsset asset) {
        if (unitId == null)
            return;
        MilitaryUnit unit = unitRepository.findById(unitId).orElse(null);
        if (unit != null) {
            if (unit.getUavAssets() == null) {
                unit.setUavAssets(new ArrayList<>());
            }
            unit.getUavAssets().add(asset);
            unitRepository.save(unit);
        }
    }

    public void removeAssetFromUnit(String unitId, String assetId) {
        if (unitId == null)
            return;
        MilitaryUnit unit = unitRepository.findById(unitId).orElse(null);
        if (unit != null && unit.getUavAssets() != null) {
            unit.getUavAssets().removeIf(asset -> asset.getUavId().equals(assetId));
            unitRepository.save(unit);
        }
    }

    public List<UAVTelemetryDTO> getAllUAVTelemetry() {
        List<UAVTelemetryDTO> telemetryList = new ArrayList<>();
        List<MilitaryUnit> units = unitRepository.findUnitsWithUavs();
        for (MilitaryUnit unit : units) {
            for (UAVAsset asset : unit.getUavAssets()) {
                UAVTelemetryDTO dto = new UAVTelemetryDTO();
                dto.setUavId(asset.getUavId());
                dto.setBatteryLevel(asset.getBatteryStatus());
                dto.setStreamUrl(asset.getStreamUrl());
                dto.setStatus("ON_STATION"); // Default status
                if (asset.getLocation() != null) {
                    dto.setLocation(asset.getLocation());
                } else {
                    dto.setLocation(unit.getLocation());
                }
                telemetryList.add(dto);
            }
        }
        return telemetryList;
    }

    private int updateCycle = 0;

    @org.springframework.scheduling.annotation.Scheduled(fixedRate = 3000)
    public void simulateUAVFlight() {
        List<MilitaryUnit> units = unitRepository.findUnitsWithUavs();
        updateCycle++;

        for (MilitaryUnit unit : units) {
            boolean unitChanged = false;
            for (UAVAsset asset : unit.getUavAssets()) {
                if (asset.getBatteryStatus() == null)
                    asset.setBatteryStatus(100.0);
                if (asset.getBatteryStatus() <= 0)
                    continue;

                // Battery Drain
                double drain = 0.5; // % per 3s
                asset.setBatteryStatus(Math.max(0, asset.getBatteryStatus() - drain));

                // Movement Simulation (Orbiting around Unit or current location)
                if (asset.getLocation() == null)
                    asset.setLocation(unit.getLocation());

                double time = System.currentTimeMillis() / 2000.0;
                double radius = 0.003; // Approx 300m
                double centerLat = unit.getLocation().getLat();
                double centerLon = unit.getLocation().getLon();

                int offset = asset.getUavId().hashCode();

                double newLat = centerLat + (radius * Math.sin(time + offset));
                double newLon = centerLon + (radius * Math.cos(time + offset));

                GeoLocation newLoc = new GeoLocation();
                newLoc.setLat(newLat);
                newLoc.setLon(newLon);
                asset.setLocation(newLoc);

                unitChanged = true;
            }

            if (unitChanged) {
                // Persistent save every 10 cycles (approx 30 seconds) to reduce DB load
                if (updateCycle % 10 == 0) {
                    unitRepository.save(unit);
                }
                // Always broadcast for UI responsiveness
                broadcastTelemetry(unit);
            }
        }
    }

    private void broadcastTelemetry(MilitaryUnit unit) {
        if (unit.getUavAssets() == null)
            return;

        List<UAVTelemetryDTO> dtos = unit.getUavAssets().stream().map(asset -> {
            UAVTelemetryDTO dto = new UAVTelemetryDTO();
            dto.setUavId(asset.getUavId());
            dto.setBatteryLevel(asset.getBatteryStatus());
            dto.setStreamUrl(asset.getStreamUrl());
            dto.setStatus("ON_STATION");
            dto.setLocation(asset.getLocation() != null ? asset.getLocation() : unit.getLocation());
            return dto;
        }).collect(Collectors.toList());

        if (!dtos.isEmpty()) {
            messagingTemplate.convertAndSend("/topic/uav-telemetry", (Object) dtos);
        }
    }
}
