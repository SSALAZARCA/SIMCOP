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

import java.util.*;
import java.util.stream.Collectors;

@Service
public class UAVService {

    @Autowired
    private MilitaryUnitRepository unitRepository;

    @Autowired
    private UAVMissionRepository missionRepository;

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    @Autowired
    private FireMissionService fireMissionService;

    @Autowired
    private WhatsAppService whatsAppService;

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
            if (unit.getUavAssets() != null && !unit.getUavAssets().isEmpty()) {
                for (UAVAsset asset : unit.getUavAssets()) {
                    boolean typeMatch = false;
                    if (missionType.equals("STRIKE") && "ATTACK".equalsIgnoreCase(asset.getUavType()))
                        typeMatch = true;
                    if (missionType.equals("RECON")
                            && ("INTEL".equalsIgnoreCase(asset.getUavType()) || "SPECIALIZED".equalsIgnoreCase(asset.getUavType())))
                        typeMatch = true;

                    if (typeMatch && asset.getBatteryStatus() != null && asset.getBatteryStatus() > 20.0) {
                        double dist = calculateDistance(unit.getLocation().getLat(), unit.getLocation().getLon(), lat, lon);
                        if (dist <= asset.getOperationalRadius()) {
                            availableSupport.add(unit);
                            break;
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

    /**
     * Conecta y aprovisiona un nuevo UAV o Estación Terrestre (GCS) en una unidad militar.
     */
    public UAVAsset connectUAV(String unitId, UAVAsset asset) {
        if (unitId == null || asset == null) return null;
        MilitaryUnit unit = unitRepository.findById(unitId).orElse(null);
        if (unit == null) return null;

        if (asset.getUavId() == null || asset.getUavId().trim().isEmpty()) {
            asset.setUavId("UAV-" + (1000 + (int)(Math.random() * 9000)));
        }
        if (asset.getModelName() == null || asset.getModelName().trim().isEmpty()) {
            asset.setModelName("RPA Táctico ISR");
        }
        if (asset.getConnectionProtocol() == null || asset.getConnectionProtocol().trim().isEmpty()) {
            asset.setConnectionProtocol("SIMULATED");
        }
        if (asset.getTelemetryToken() == null) {
            asset.setTelemetryToken(UUID.randomUUID().toString());
        }
        if (asset.getBatteryStatus() == null) {
            asset.setBatteryStatus(100.0);
        }
        if (asset.getAltitudeMeters() == null) {
            asset.setAltitudeMeters(150.0);
        }
        if (asset.getSpeedKmh() == null) {
            asset.setSpeedKmh(45.0);
        }
        if (asset.getHeadingDegrees() == null) {
            asset.setHeadingDegrees(0.0);
        }
        if (asset.getCameraMode() == null) {
            asset.setCameraMode("EO");
        }
        if (asset.getFlightStatus() == null) {
            asset.setFlightStatus("ON_STATION");
        }
        if (asset.getSignalStrength() == null) {
            asset.setSignalStrength(95);
        }
        if (asset.getSatellites() == null) {
            asset.setSatellites(18);
        }
        if (asset.getLocation() == null) {
            asset.setLocation(unit.getLocation());
        }
        asset.setLastHeartbeat(System.currentTimeMillis());

        if (unit.getUavAssets() == null) {
            unit.setUavAssets(new ArrayList<>());
        }
        unit.getUavAssets().removeIf(a -> a.getUavId().equals(asset.getUavId()));
        unit.getUavAssets().add(asset);
        unitRepository.save(unit);

        broadcastTelemetry(unit);
        return asset;
    }

    /**
     * Ejecuta comandos C2 sobre el dron (RTH, ORBIT, PATROL, CAMERA_MODE, DESIGNATE_TARGET).
     */
    public Map<String, Object> executeCommand(String uavId, String command, Map<String, Object> params) {
        Map<String, Object> result = new HashMap<>();
        result.put("uavId", uavId);
        result.put("command", command);

        List<MilitaryUnit> units = unitRepository.findUnitsWithUavs();
        for (MilitaryUnit unit : units) {
            for (UAVAsset asset : unit.getUavAssets()) {
                if (asset.getUavId().equals(uavId)) {
                    asset.setLastHeartbeat(System.currentTimeMillis());

                    if ("RTH".equalsIgnoreCase(command)) {
                        asset.setFlightStatus("RTH");
                        asset.setSpeedKmh(65.0);
                        result.put("message", "Comando Retorno a Base (RTH) transmitido. Navegando al punto de origen.");
                    } else if ("ORBIT".equalsIgnoreCase(command)) {
                        asset.setFlightStatus("ORBITING");
                        asset.setSpeedKmh(35.0);
                        result.put("message", "Órbita de vigilancia sobre el objetivo iniciada.");
                    } else if ("PATROL".equalsIgnoreCase(command)) {
                        asset.setFlightStatus("EN_ROUTE");
                        asset.setSpeedKmh(50.0);
                        result.put("message", "Patrulla de reconocimiento aéreo iniciada.");
                    } else if ("CAMERA_MODE".equalsIgnoreCase(command)) {
                        String mode = (params.containsKey("mode")) ? String.valueOf(params.get("mode")) : "EO";
                        asset.setCameraMode(mode);
                        result.put("message", "Modo óptico cambiado a: " + mode);
                        result.put("cameraMode", mode);
                    } else if ("DESIGNATE_TARGET".equalsIgnoreCase(command)) {
                        GeoLocation targetLoc = asset.getLocation();
                        if (params.containsKey("lat") && params.containsKey("lon")) {
                            try {
                                double lat = Double.parseDouble(String.valueOf(params.get("lat")));
                                double lon = Double.parseDouble(String.valueOf(params.get("lon")));
                                targetLoc = new GeoLocation(lat, lon);
                            } catch (Exception ignored) {}
                        }

                        FireMission mission = new FireMission();
                        mission.setId(UUID.randomUUID().toString());
                        mission.setRequesterId(unit.getId() != null ? unit.getId() : "UAV-" + asset.getUavId());
                        mission.setTargetLocation(targetLoc);
                        mission.setProjectileType("HE");
                        mission.setCharge(3);
                        mission.setStatus(FireMissionStatus.PENDING);

                        FireMission savedMission = fireMissionService.createMission(mission);
                        try {
                            whatsAppService.notifyFireMission(savedMission);
                        } catch (Exception ignored) {}

                        result.put("message", "🎯 Blanco designado y transmitido a Misión de Fuego en CDT.");
                        result.put("fireMissionId", savedMission.getId());
                        result.put("targetLocation", targetLoc);
                    } else {
                        result.put("message", "Comando ejecutado.");
                    }

                    unitRepository.save(unit);
                    broadcastTelemetry(unit);
                    result.put("success", true);
                    result.put("flightStatus", asset.getFlightStatus());
                    return result;
                }
            }
        }

        result.put("success", false);
        result.put("error", "UAV no encontrado: " + uavId);
        return result;
    }

    /**
     * Genera la guía técnica y scripts de conexión para configurar el UAV/GCS en terreno.
     */
    public Map<String, Object> getConnectionGuide(String uavId) {
        Map<String, Object> guide = new HashMap<>();
        guide.put("uavId", uavId);

        String token = "simcop-uav-" + uavId.toLowerCase();
        List<MilitaryUnit> units = unitRepository.findUnitsWithUavs();
        for (MilitaryUnit unit : units) {
            for (UAVAsset asset : unit.getUavAssets()) {
                if (asset.getUavId().equals(uavId)) {
                    if (asset.getTelemetryToken() != null) {
                        token = asset.getTelemetryToken();
                    }
                    guide.put("modelName", asset.getModelName());
                    guide.put("protocol", asset.getConnectionProtocol());
                    guide.put("streamUrl", asset.getStreamUrl());
                    break;
                }
            }
        }

        guide.put("token", token);
        guide.put("webhookUrl", "https://simcop.site/api/uav/telemetry");
        guide.put("mavlinkPort", 14550);
        guide.put("streamTypes", List.of("RTSP", "HLS", "WebRTC", "FLIR Video Feed"));

        String curlScript = "curl -X POST https://simcop.site/api/uav/telemetry \\\n" +
                "  -H \"Content-Type: application/json\" \\\n" +
                "  -d '{\n" +
                "    \"uavId\": \"" + uavId + "\",\n" +
                "    \"batteryLevel\": 85.0,\n" +
                "    \"altitude\": 145.0,\n" +
                "    \"speed\": 48.0,\n" +
                "    \"heading\": 215.0,\n" +
                "    \"status\": \"ON_STATION\",\n" +
                "    \"satellites\": 18,\n" +
                "    \"signalStrength\": 96,\n" +
                "    \"location\": {\"lat\": 1.2136, \"lon\": -77.2811}\n" +
                "  }'";

        String pythonScript = "#!/usr/bin/env python3\n" +
                "# SIMCOP UAV Ground Control Station Bridge\n" +
                "import time, requests, json\n\n" +
                "API_URL = 'https://simcop.site/api/uav/telemetry'\n" +
                "UAV_ID = '" + uavId + "'\n\n" +
                "def send_telemetry(lat, lon, alt, battery, heading=0, speed=40):\n" +
                "    payload = {\n" +
                "        'uavId': UAV_ID,\n" +
                "        'batteryLevel': battery,\n" +
                "        'altitude': alt,\n" +
                "        'speed': speed,\n" +
                "        'heading': heading,\n" +
                "        'status': 'ON_STATION',\n" +
                "        'satellites': 16,\n" +
                "        'signalStrength': 98,\n" +
                "        'location': {'lat': lat, 'lon': lon}\n" +
                "    }\n" +
                "    try:\n" +
                "        requests.post(API_URL, json=payload, timeout=3)\n" +
                "    except Exception as e:\n" +
                "        print(f'Error de transmision: {e}')\n\n" +
                "# Bucle de transmision a 1 Hz\n" +
                "send_telemetry(1.2136, -77.2811, 150.0, 92.0, 180.0, 45.0)\n";

        guide.put("curlExample", curlScript);
        guide.put("pythonScript", pythonScript);
        return guide;
    }

    // Process incoming webhook telemetry
    public void processTelemetry(com.simcop.dto.UAVTelemetryDTO telemetry) {
        if (telemetry == null || telemetry.getUavId() == null) return;
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
                    if (telemetry.getAltitude() != null)
                        asset.setAltitudeMeters(telemetry.getAltitude());
                    if (telemetry.getSpeed() != null)
                        asset.setSpeedKmh(telemetry.getSpeed());
                    if (telemetry.getHeading() != null)
                        asset.setHeadingDegrees(telemetry.getHeading());
                    if (telemetry.getCameraMode() != null)
                        asset.setCameraMode(telemetry.getCameraMode());
                    if (telemetry.getStatus() != null)
                        asset.setFlightStatus(telemetry.getStatus());
                    if (telemetry.getSatellites() != null)
                        asset.setSatellites(telemetry.getSatellites());
                    if (telemetry.getSignalStrength() != null)
                        asset.setSignalStrength(telemetry.getSignalStrength());
                    asset.setLastHeartbeat(System.currentTimeMillis());
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
        connectUAV(unitId, asset);
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
                dto.setModelName(asset.getModelName() != null ? asset.getModelName() : "RPA Táctico");
                dto.setConnectionProtocol(asset.getConnectionProtocol() != null ? asset.getConnectionProtocol() : "SIMULATED");
                dto.setBatteryLevel(asset.getBatteryStatus());
                dto.setAltitude(asset.getAltitudeMeters() != null ? asset.getAltitudeMeters() : 120.0);
                dto.setSpeed(asset.getSpeedKmh() != null ? asset.getSpeedKmh() : 45.0);
                dto.setHeading(asset.getHeadingDegrees() != null ? asset.getHeadingDegrees() : 0.0);
                dto.setCameraMode(asset.getCameraMode() != null ? asset.getCameraMode() : "EO");
                dto.setSatellites(asset.getSatellites() != null ? asset.getSatellites() : 16);
                dto.setSignalStrength(asset.getSignalStrength() != null ? asset.getSignalStrength() : 95);
                dto.setStreamUrl(asset.getStreamUrl());
                dto.setStatus(asset.getFlightStatus() != null ? asset.getFlightStatus() : "ON_STATION");
                dto.setLocation(asset.getLocation() != null ? asset.getLocation() : unit.getLocation());
                dto.setTimestamp(System.currentTimeMillis());
                telemetryList.add(dto);
            }
        }
        return telemetryList;
    }

    private int updateCycle = 0;

    @org.springframework.scheduling.annotation.Scheduled(fixedRate = 2500)
    public void simulateUAVFlight() {
        List<MilitaryUnit> units = unitRepository.findUnitsWithUavs();
        updateCycle++;

        for (MilitaryUnit unit : units) {
            boolean unitChanged = false;
            for (UAVAsset asset : unit.getUavAssets()) {
                // Solo simular movimiento si está en modo SIMULATED o si no tiene protocolo externo
                if (asset.getConnectionProtocol() != null && 
                    !"SIMULATED".equalsIgnoreCase(asset.getConnectionProtocol()) &&
                    (System.currentTimeMillis() - (asset.getLastHeartbeat() != null ? asset.getLastHeartbeat() : 0) < 15000)) {
                    // Dron físico con telemetría activa en los últimos 15s, no sobreescribir con simulación
                    continue;
                }

                if (asset.getBatteryStatus() == null)
                    asset.setBatteryStatus(100.0);
                if (asset.getBatteryStatus() <= 0)
                    continue;

                // Consumo gradual
                double drain = 0.2; // % por ciclo
                asset.setBatteryStatus(Math.max(0, asset.getBatteryStatus() - drain));

                if (asset.getLocation() == null)
                    asset.setLocation(unit.getLocation());

                double time = System.currentTimeMillis() / 2500.0;
                double radius = 0.004; // ~400m
                double centerLat = unit.getLocation().getLat();
                double centerLon = unit.getLocation().getLon();

                int offset = asset.getUavId().hashCode();

                double newLat = centerLat + (radius * Math.sin(time + offset));
                double newLon = centerLon + (radius * Math.cos(time + offset));

                GeoLocation newLoc = new GeoLocation();
                newLoc.setLat(newLat);
                newLoc.setLon(newLon);
                asset.setLocation(newLoc);

                // Rumbo tangencial realista (0-360)
                double heading = (Math.toDegrees(time + offset) + 90.0) % 360.0;
                asset.setHeadingDegrees(Math.abs(heading));
                asset.setAltitudeMeters(140.0 + 8.0 * Math.sin(time * 0.5));
                asset.setSpeedKmh(48.0 + 4.0 * Math.cos(time * 0.3));

                unitChanged = true;
            }

            if (unitChanged) {
                if (updateCycle % 10 == 0) {
                    unitRepository.save(unit);
                }
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
            dto.setModelName(asset.getModelName() != null ? asset.getModelName() : "RPA Táctico");
            dto.setConnectionProtocol(asset.getConnectionProtocol() != null ? asset.getConnectionProtocol() : "SIMULATED");
            dto.setBatteryLevel(asset.getBatteryStatus());
            dto.setAltitude(asset.getAltitudeMeters() != null ? asset.getAltitudeMeters() : 120.0);
            dto.setSpeed(asset.getSpeedKmh() != null ? asset.getSpeedKmh() : 45.0);
            dto.setHeading(asset.getHeadingDegrees() != null ? asset.getHeadingDegrees() : 0.0);
            dto.setCameraMode(asset.getCameraMode() != null ? asset.getCameraMode() : "EO");
            dto.setSatellites(asset.getSatellites() != null ? asset.getSatellites() : 16);
            dto.setSignalStrength(asset.getSignalStrength() != null ? asset.getSignalStrength() : 95);
            dto.setStreamUrl(asset.getStreamUrl());
            dto.setStatus(asset.getFlightStatus() != null ? asset.getFlightStatus() : "ON_STATION");
            dto.setLocation(asset.getLocation() != null ? asset.getLocation() : unit.getLocation());
            dto.setTimestamp(System.currentTimeMillis());
            return dto;
        }).collect(Collectors.toList());

        if (!dtos.isEmpty()) {
            messagingTemplate.convertAndSend("/topic/uav-telemetry", (Object) dtos);
        }
    }
}
