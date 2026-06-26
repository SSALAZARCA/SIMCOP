package com.sigep.service;

import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.http.ResponseEntity;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpMethod;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class AIRecommendationService {

    private final String SIMCOP_URL = "http://localhost:8080/api";

    public List<Map<String, Object>> generateRecommendations() {
        RestTemplate restTemplate = new RestTemplate();
        List<Map<String, Object>> recommendations = new ArrayList<>();

        try {
            // 1. Obtener todas las unidades (Catálogo Completo)
            ResponseEntity<List<Map<String, Object>>> unitsResponse = restTemplate.exchange(
                    SIMCOP_URL + "/units",
                    HttpMethod.GET,
                    null,
                    new ParameterizedTypeReference<List<Map<String, Object>>>() {}
            );
            List<Map<String, Object>> allUnits = unitsResponse.getBody();

            if (allUnits == null) return recommendations;

            // 2. Obtener todos los soldados de SIMCOP
            ResponseEntity<List<Map<String, Object>>> soldiersResponse = restTemplate.exchange(
                    SIMCOP_URL + "/soldiers/search?q=",
                    HttpMethod.GET,
                    null,
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
                            Map<String, Object> u = (Map<String, Object>) s.get("unit");
                            return u != null && sourceUnitId.equals(u.get("id"));
                        })
                        .filter(s -> "APTO".equals(s.get("healthStatus"))) // Solo sanidad APTA
                        .filter(s -> s.get("timeInPosition") != null && ((Number) s.get("timeInPosition")).intValue() > 24) // Más de 2 años
                        .collect(Collectors.toList());
                        
                    if (!candidates.isEmpty()) {
                        // Tomamos el mejor candidato (el primero para simplificar)
                        Map<String, Object> bestCandidate = candidates.get(0);
                        
                        Map<String, Object> rec = Map.of(
                            "sourceUnit", sourceUnitId,
                            "targetUnit", targetUnitId,
                            "soldier", Map.of(
                                "id", bestCandidate.get("id"),
                                "name", bestCandidate.get("fullName"),
                                "rank", bestCandidate.get("rank"),
                                "moceCode", bestCandidate.get("moceCode"),
                                "healthStatus", bestCandidate.get("healthStatus"),
                                "timeInPosition", bestCandidate.get("timeInPosition"),
                                "cursosCombate", bestCandidate.get("cursosCombate")
                            ),
                            "reason", String.format("La unidad %s está en nivel Óptimo. %s tiene un déficit crítico (POI alto). El candidato %s tiene sanidad APTA, %s meses en la unidad y cumple perfil táctico.", 
                                sourceUnitId, targetUnitId, bestCandidate.get("fullName"), bestCandidate.get("timeInPosition"))
                        );
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
