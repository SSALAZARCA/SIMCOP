package com.sigep.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.http.ResponseEntity;
import java.util.Map;
import java.util.List;

import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import java.util.Map;
import java.util.HashMap;
import java.util.List;

@Service
public class SimcopSyncService {

    private final RestTemplate restTemplate = new RestTemplate();
    private final String SIMCOP_API_URL = "http://localhost:8080/api/units";
    public List<Map<String, Object>> getLiveUnitsFromSimcop() {
        try {
            ResponseEntity<List> response = restTemplate.getForEntity(SIMCOP_API_URL, List.class);
            return response.getBody();
        } catch (Exception e) {
            System.err.println("Error sincronizando con SIMCOP: " + e.getMessage());
            return List.of();
        }
    }

    public Map<String, Object> getUnitDetails(String unitId) {
        try {
            ResponseEntity<Map> response = restTemplate.getForEntity(SIMCOP_API_URL + "/" + unitId, Map.class);
            return response.getBody();
        } catch (Exception e) {
            System.err.println("Error obteniendo detalles de la unidad en SIMCOP: " + e.getMessage());
            return null;
        }
    }
}
