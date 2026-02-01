package com.simcop.service;

import com.simcop.dto.BMARecommendationDTO;
import com.simcop.dto.LogisticsPredictionDTO;
import com.simcop.dto.HotspotDTO;
import com.simcop.model.*;
import com.simcop.model.embeddable.GeoLocation;
import com.simcop.repository.MilitaryUnitRepository;
import com.simcop.repository.IntelligenceReportRepository;
import com.simcop.repository.LogisticsRequestRepository;
import com.simcop.repository.AlertRepository;
import java.util.*;
import java.util.stream.Collectors;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

@Service
public class BMAService {

    @Autowired
    private MilitaryUnitRepository unitRepository;

    @Autowired
    private IntelligenceReportRepository intelRepository;

    @Autowired
    private LogisticsRequestRepository logisticsRepository;

    @Autowired
    private WeatherService weatherService;
    @Autowired
    private AlertRepository alertRepository;

    public List<BMARecommendationDTO> recommendResponse(String threatId) {
        if (threatId == null)
            return new ArrayList<>();
        IntelligenceReport threat = intelRepository.findById(threatId).orElse(null);
        if (threat == null)
            return new ArrayList<>();

        List<MilitaryUnit> operationalUnits = unitRepository.findAll().stream()
                .filter(u -> u.getStatus() == UnitStatus.OPERATIONAL || u.getStatus() == UnitStatus.ENGAGED)
                .collect(Collectors.toList());

        List<BMARecommendationDTO> recommendations = new ArrayList<>();

        for (MilitaryUnit unit : operationalUnits) {
            double distance = calculateDistance(
                    unit.getLocation().getLat(), unit.getLocation().getLon(),
                    threat.getLocation().getLat(), threat.getLocation().getLon());

            double score = 100.0;
            StringBuilder reasoning = new StringBuilder();

            // 1. Distance factor (0-40 score)
            // Assuming max response radius of 50km for full points
            double distanceScore = Math.max(0, 40 * (1 - (distance / 50.0)));
            score -= (40 - distanceScore);
            reasoning.append(String.format("Distancia: %.2f km. ", distance));

            // 2. Status factor (0-20 score)
            if (unit.getStatus() == UnitStatus.OPERATIONAL) {
                reasoning.append("Unidad plenamente operativa. ");
            } else if (unit.getStatus() == UnitStatus.ENGAGED) {
                score -= 10;
                reasoning.append("Unidad actualmente en combate (disponibilidad reducida). ");
            }

            // 3. Ammo & Supplies (0-20 score)
            if (unit.getAmmoLevel() != null) {
                if (unit.getAmmoLevel() < 0.3) {
                    score -= 15;
                    reasoning.append("Nivel crítico de munición (").append(Math.round(unit.getAmmoLevel() * 100))
                            .append("%). ");
                } else if (unit.getAmmoLevel() < 0.6) {
                    score -= 5;
                    reasoning.append("Nivel medio de munición. ");
                }
            }

            // 4. Capability Match (0-20 score)
            boolean match = false;
            for (String cap : unit.getCapabilities()) {
                for (String key : threat.getKeywords()) {
                    if (cap.toLowerCase().contains(key.toLowerCase())) {
                        match = true;
                        break;
                    }
                }
            }
            if (match) {
                score += 10;
                reasoning.append("Capacidad de la unidad coincide con la amenaza. ");
            }

            double speedKmH = 25.0; // Base cross-country speed

            // Integrate weather impact on mobility
            WeatherInfo weather = weatherService.getCurrentWeather(unit.getLocation().getLat(),
                    unit.getLocation().getLon());
            if (weather.isOperationalImpact()) {
                speedKmH *= 0.6; // 40% reduction for adverse weather
                reasoning.append("Movilidad reducida por clima (").append(weather.getCondition()).append("). ");
            } else if (weather.getCondition().equals("Nublado")) {
                speedKmH *= 0.85; // 15% reduction
            }

            // --- CCM Analysis (Terrain/Slope Simulation) ---
            // Simulating higher difficulty in mountainous areas (simplified by Lat/Lon)
            if (unit.getLocation().getLat() > 6.0 || unit.getLocation().getLat() < 2.0) {
                speedKmH *= 0.8; // 20% reduction for suspected high slopes / rugged terrain
                reasoning.append("Terreno accidentado detectado (CCM). ");
            }

            double timeToIntercept = (distance / speedKmH) * 60; // in minutes

            recommendations.add(new BMARecommendationDTO(
                    unit.getId(),
                    unit.getName(),
                    reasoning.toString().trim(),
                    Math.max(0, score),
                    timeToIntercept));
        }

        return recommendations.stream()
                .sorted(Comparator.comparingDouble(BMARecommendationDTO::getScore).reversed())
                .limit(5)
                .collect(Collectors.toList());
    }

    public List<LogisticsPredictionDTO> predictLogistics() {
        return unitRepository.findAll().stream()
                .filter(u -> u.getDaysOfSupply() != null && u.getDaysOfSupply() < 7.0)
                .map(unit -> {
                    String status = unit.getDaysOfSupply() < 2.0 ? "CRÍTICO" : "BAJO";
                    String recommendation = "Programar reabastecimiento urgente.";

                    // Suggest closest support unit (Battalion/Brigade)
                    MilitaryUnit support = findClosestSupportUnit(unit);
                    if (support != null) {
                        recommendation = "Reabastecer desde " + support.getName() + " (" +
                                Math.round(calculateDistance(unit.getLocation().getLat(), unit.getLocation().getLon(),
                                        support.getLocation().getLat(), support.getLocation().getLon()))
                                + " km).";
                    }

                    return new LogisticsPredictionDTO(
                            unit.getId(),
                            unit.getName(),
                            unit.getDaysOfSupply(),
                            status,
                            recommendation);
                })
                .sorted(Comparator.comparingDouble(LogisticsPredictionDTO::getDaysRemaining))
                .collect(Collectors.toList());
    }

    private MilitaryUnit findClosestSupportUnit(MilitaryUnit unit) {
        return unitRepository.findAll().stream()
                .filter(u -> u.getType() == UnitType.BATTALION || u.getType() == UnitType.BRIGADE)
                .filter(u -> !u.getId().equals(unit.getId()))
                .min(Comparator.comparingDouble(u -> calculateDistance(
                        unit.getLocation().getLat(), unit.getLocation().getLon(),
                        u.getLocation().getLat(), u.getLocation().getLon())))
                .orElse(null);
    }

    public void requestResupply(String unitId) {
        if (unitId == null)
            return;
        MilitaryUnit unit = unitRepository.findById(unitId).orElse(null);
        if (unit == null)
            return;

        MilitaryUnit support = findClosestSupportUnit(unit);
        String details = "Solicitud automática generada por BMA. Se requiere reabastecimiento urgente de munición y suministros.";
        if (support != null) {
            details += " Unidad de apoyo recomendada: " + support.getName();
        }

        LogisticsRequest request = new LogisticsRequest();
        request.setId(UUID.randomUUID().toString());
        request.setOriginatingUnitId(unit.getId());
        request.setOriginatingUnitName(unit.getName());
        request.setDetails(details);
        request.setRequestTimestamp(System.currentTimeMillis());
        request.setStatus("pendiente");

        logisticsRepository.save(request);
    }

    public List<HotspotDTO> identifyHotspots() {
        return identifyHotspotsForPeriod(System.currentTimeMillis() - (24 * 60 * 60 * 1000L)); // Last 24h by default
    }

    public List<HotspotDTO> identifyHotspotsForPeriod(long sinceTimestamp) {
        List<IntelligenceReport> reports = intelRepository.findAll().stream()
                .filter(r -> r.getEventTimestamp() >= sinceTimestamp)
                .collect(Collectors.toList());
        List<HotspotDTO> hotspots = new ArrayList<>();
        if (reports.isEmpty())
            return hotspots;

        // Simple clustering: group reports within 5km
        boolean[] processed = new boolean[reports.size()];

        for (int i = 0; i < reports.size(); i++) {
            if (processed[i])
                continue;

            List<IntelligenceReport> cluster = new ArrayList<>();
            cluster.add(reports.get(i));
            processed[i] = true;

            for (int j = i + 1; j < reports.size(); j++) {
                if (processed[j])
                    continue;

                double dist = calculateDistance(
                        reports.get(i).getLocation().getLat(), reports.get(i).getLocation().getLon(),
                        reports.get(j).getLocation().getLat(), reports.get(j).getLocation().getLon());

                if (dist < 5.0) { // 5km radius
                    cluster.add(reports.get(j));
                    processed[j] = true;
                }
            }

            if (cluster.size() >= 3) { // Only clusters with 3+ reports
                // Calculate average center
                double avgLat = cluster.stream().mapToDouble(r -> r.getLocation().getLat()).average().orElse(0);
                double avgLon = cluster.stream().mapToDouble(r -> r.getLocation().getLon()).average().orElse(0);

                String description = "Concentración detectada de " + cluster.size()
                        + " reportes. Área de riesgo elevado.";
                hotspots.add(new HotspotDTO(new GeoLocation(avgLat, avgLon), 5.0, cluster.size(), description));

                // Proactive Alerting: Check if any operational unit is within this hotspot
                checkAndAlertUnitsInHotspot(avgLat, avgLon, cluster.size());
            }
        }

        return hotspots;
    }

    private void checkAndAlertUnitsInHotspot(double hotspotLat, double hotspotLon, int intensity) {
        List<MilitaryUnit> units = unitRepository.findAll().stream()
                .filter(u -> u.getStatus() == UnitStatus.OPERATIONAL || u.getStatus() == UnitStatus.ENGAGED)
                .collect(Collectors.toList());

        for (MilitaryUnit unit : units) {
            double dist = calculateDistance(unit.getLocation().getLat(), unit.getLocation().getLon(), hotspotLat,
                    hotspotLon);
            if (dist < 5.0) { // Same as cluster radius
                // Check if an alert already exists for this unit and type today to avoid spam
                long todayStart = System.currentTimeMillis() - (System.currentTimeMillis() % 86400000);
                boolean exists = alertRepository.findAll().stream()
                        .anyMatch(a -> a.getUnitId() != null && a.getUnitId().equals(unit.getId())
                                && a.getType() == AlertType.BMA_HOTSPOT_THREAT
                                && a.getTimestamp() > todayStart
                                && !a.isAcknowledged());

                if (!exists) {
                    Alert alert = new Alert();
                    alert.setId(UUID.randomUUID().toString());
                    alert.setType(AlertType.BMA_HOTSPOT_THREAT);
                    alert.setUnitId(unit.getId());
                    alert.setSeverity(AlertSeverity.HIGH);
                    alert.setTimestamp(System.currentTimeMillis());
                    alert.setLocation(unit.getLocation());
                    alert.setMessage("ALERTA BMA: La unidad " + unit.getName()
                            + " se encuentra en un Punto Crítico de alta intensidad (" + intensity
                            + " reportes). Incrementar alerta.");
                    alertRepository.save(alert);
                }
            }
        }
    }

    private double calculateDistance(double lat1, double lon1, double lat2, double lon2) {
        double earthRadius = 6371; // km
        double dLat = Math.toRadians(lat2 - lat1);
        double dLon = Math.toRadians(lon2 - lon1);
        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2)) *
                        Math.sin(dLon / 2) * Math.sin(dLon / 2);
        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return earthRadius * c;
    }
}
