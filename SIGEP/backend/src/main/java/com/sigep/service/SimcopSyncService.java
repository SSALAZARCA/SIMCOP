package com.sigep.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.http.ResponseEntity;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;

import java.util.List;
import java.util.Map;

@Service
public class SimcopSyncService {

    @Autowired
    private RestTemplate restTemplate;

    @Value("${simcop.api.url:http://localhost:8080/api}")
    private String configuredSimcopUrl;

    @Value("${simcop.service.token:simcop-tactical-m2m-secure-token-2026}")
    private String configuredServiceToken;

    private String getSimcopBaseUrl() {
        String envUrl = System.getenv("SIMCOP_API_URL");
        String url = (envUrl != null && !envUrl.trim().isEmpty()) ? envUrl.trim() : configuredSimcopUrl.trim();
        if (url.endsWith("/")) {
            url = url.substring(0, url.length() - 1);
        }
        return url.endsWith("/api") ? url : url + "/api";
    }

    private String getServiceToken() {
        String envToken = System.getenv("SIMCOP_SERVICE_TOKEN");
        return (envToken != null && !envToken.trim().isEmpty()) ? envToken.trim() : configuredServiceToken.trim();
    }

    private HttpHeaders createM2MHeaders() {
        HttpHeaders headers = new HttpHeaders();
        String token = getServiceToken();
        headers.set("X-Service-Token", token);
        headers.set("Authorization", "Bearer " + token);
        return headers;
    }

    public List<Map<String, Object>> getLiveUnitsFromSimcop() {
        try {
            String url = getSimcopBaseUrl() + "/units";
            HttpEntity<Void> entity = new HttpEntity<>(createM2MHeaders());
            ResponseEntity<List> response = restTemplate.exchange(url, HttpMethod.GET, entity, List.class);
            return response.getBody();
        } catch (Exception e) {
            System.err.println("Error sincronizando con SIMCOP: " + e.getMessage());
            return List.of();
        }
    }

    public Map<String, Object> getUnitDetails(String unitId) {
        try {
            String url = getSimcopBaseUrl() + "/units/" + unitId;
            HttpEntity<Void> entity = new HttpEntity<>(createM2MHeaders());
            ResponseEntity<Map> response = restTemplate.exchange(url, HttpMethod.GET, entity, Map.class);
            return response.getBody();
        } catch (Exception e) {
            System.err.println("Error obteniendo detalles de la unidad en SIMCOP: " + e.getMessage());
            return null;
        }
    }
}
