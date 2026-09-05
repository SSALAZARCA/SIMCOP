package com.sigep.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.http.ResponseEntity;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.core.ParameterizedTypeReference;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class AIRecommendationService {

    @Autowired
    private RestTemplate restTemplate;

    @Autowired
    private GenAITacticalService genAITacticalService;

    @Value("${simcop.api.url:http://localhost:8080/api}")
    private String configuredSimcopUrl;

    @Value("${simcop.service.token:simcop-tactical-m2m-secure-token-2026}")
    private String configuredServiceToken;

    private String getSimcopBaseUrl() {
        String envUrl = System.getenv("SIMCOP_API_URL");
        String url = (envUrl != null && !envUrl.trim().isEmpty()) ? envUrl.trim() : configuredSimcopUrl.trim();
        if (url.endsWith("/")) url = url.substring(0, url.length() - 1);
        return url.endsWith("/api") ? url : url + "/api";
    }

    private HttpHeaders createM2MHeaders() {
        HttpHeaders headers = new HttpHeaders();
        String envToken = System.getenv("SIMCOP_SERVICE_TOKEN");
        String token = (envToken != null && !envToken.trim().isEmpty()) ? envToken.trim() : configuredServiceToken.trim();
        headers.set("X-Service-Token", token);
        headers.set("Authorization", "Bearer " + token);
        return headers;
    }

    public List<Map<String, Object>> generateRecommendations() {
        List<Map<String, Object>> recommendations = new ArrayList<>();

        try {
            HttpEntity<Void> requestEntity = new HttpEntity<>(createM2MHeaders());

            // 1. Obtener todas las unidades (Catálogo Completo)
            ResponseEntity<List<Map<String, Object>>> unitsResponse = restTemplate.exchange(
                    getSimcopBaseUrl() + "/units",
                    HttpMethod.GET,
                    requestEntity,
                    new ParameterizedTypeReference<List<Map<String, Object>>>() {}
            );
            List<Map<String, Object>> allUnits = unitsResponse.getBody();

            if (allUnits == null) return recommendations;

            // 2. Obtener todos los soldados de SIMCOP
            ResponseEntity<List<Map<String, Object>>> soldiersResponse = restTemplate.exchange(
                    getSimcopBaseUrl() + "/soldiers/search?q=",
                    HttpMethod.GET,
                    requestEntity,
                    new ParameterizedTypeReference<List<Map<String, Object>>>() {}
            );
            List<Map<String, Object>> allSoldiers = soldiersResponse.getBody();

            if (allSoldiers == null) return recommendations;

            // 3. Separar unidades en Déficit (Target) y Óptimas (Source)
            List<Map<String, Object>> unitsWithDeficit = new ArrayList<>();
            List<Map<String, Object>> optimalUnits = new ArrayList<>();

            for (Map<String, Object> unit : allUnits) {
                // Cálculo simple de salud de la unidad usando el índice de orden público y estado
                String status = (String) unit.get("status");
                Double poi = unit.get("publicOrderIndex") != null ? ((Number) unit.get("publicOrderIndex")).doubleValue() : 0.0;
                
                // Si el POI es alto (>8) o el status es ALERTA ROJA, está en déficit operativo
                if (poi > 8.0 || "ALERTA ROJA".equals(status)) {
                    unitsWithDeficit.add(unit);
                } else if (poi < 5.0 || "OPTIMO".equals(status) || "NORMAL".equals(status)) {
                    optimalUnits.add(unit);
                }
            }

            // 4. Algoritmo de Cruce IA
            for (Map<String, Object> targetUnit : unitsWithDeficit) {
                String targetUnitId = (String) targetUnit.get("id");
                
                // Buscar candidatos idóneos en unidades óptimas
                for (Map<String, Object> sourceUnit : optimalUnits) {
                    String sourceUnitId = (String) sourceUnit.get("id");
                    
                    // Filtrar soldados que pertenecen a la unidad de origen (sourceUnit)
                    List<Map<String, Object>> candidates = allSoldiers.stream()
                        .filter(s -> {
                            String soldierUnitId = null;
                            Object uObj = s.get("unit");
                            if (uObj instanceof Map<?, ?> uMap) {
                                Object idVal = uMap.get("id");
                                soldierUnitId = idVal != null ? idVal.toString() : null;
                            }
                            if (soldierUnitId == null && s.get("unitId") != null) {
                                soldierUnitId = s.get("unitId").toString();
                            }
                            return sourceUnitId.equals(soldierUnitId);
                        })
                        .filter(s -> "APTO".equalsIgnoreCase((String) s.get("healthStatus"))) // Solo sanidad APTA
                        .filter(s -> s.get("timeInPosition") != null && ((Number) s.get("timeInPosition")).intValue() > 24) // Más de 2 años
                        .collect(Collectors.toList());
                        
                    if (!candidates.isEmpty()) {
                        // Tomamos el mejor candidato (el primero para simplificar)
                        Map<String, Object> bestCandidate = candidates.get(0);
                        
                        Map<String, Object> soldierData = new HashMap<>();
                        soldierData.put("id", bestCandidate.get("id") != null ? bestCandidate.get("id") : "");
                        soldierData.put("name", bestCandidate.get("fullName") != null ? bestCandidate.get("fullName") : (bestCandidate.get("name") != null ? bestCandidate.get("name") : ""));
                        soldierData.put("rank", bestCandidate.get("rank") != null ? bestCandidate.get("rank") : "");
                        soldierData.put("moceCode", bestCandidate.get("moceCode") != null ? bestCandidate.get("moceCode") : (bestCandidate.get("mosCode") != null ? bestCandidate.get("mosCode") : ""));
                        soldierData.put("healthStatus", bestCandidate.get("healthStatus") != null ? bestCandidate.get("healthStatus") : "");
                        soldierData.put("timeInPosition", bestCandidate.get("timeInPosition") != null ? bestCandidate.get("timeInPosition") : 0);
                        soldierData.put("cursosCombate", bestCandidate.get("cursosCombate") != null ? bestCandidate.get("cursosCombate") : "NINGUNO");

                        Map<String, Object> rec = new HashMap<>();
                        rec.put("sourceUnit", sourceUnitId);
                        rec.put("targetUnit", targetUnitId);
                        rec.put("soldier", soldierData);
                        rec.put("reason", String.format("La unidad %s está en nivel Óptimo. %s tiene un déficit crítico (POI alto). El candidato %s tiene sanidad APTA, %s meses en la unidad y cumple perfil táctico.", 
                            sourceUnitId, targetUnitId, soldierData.get("name"), soldierData.get("timeInPosition")));
                        String tacticalAssessment = genAITacticalService.generateTacticalAssessment(soldierData, sourceUnit, targetUnit);
                        rec.put("tacticalAssessment", tacticalAssessment);
                        recommendations.add(rec);
                        break; // Pasamos a la siguiente unidad en déficit
                    }
                }
            }

        } catch (Exception e) {
            System.err.println("Error en motor IA: " + e.getMessage());
        }

        return recommendations;
    }
}
