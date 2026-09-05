package com.simcop.service;

import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import java.util.Map;

@Service
public class SigepIntegrationService {

    private static final Logger logger = LoggerFactory.getLogger(SigepIntegrationService.class);
    private final RestTemplate restTemplate;

    public SigepIntegrationService() {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(5000);
        factory.setReadTimeout(5000);
        this.restTemplate = new RestTemplate(factory);
    }

    private String getSigepBaseUrl() {
        String envUrl = System.getenv("SIGEP_API_URL");
        if (envUrl != null && !envUrl.trim().isEmpty()) {
            return envUrl.trim().endsWith("/api/simcop") ? envUrl.trim() : envUrl.trim() + "/api/simcop";
        }
        return "http://localhost:4000/api/simcop";
    }

    private String getServiceToken() {
        String token = System.getenv("SIMCOP_SERVICE_TOKEN");
        return (token != null && !token.trim().isEmpty()) ? token.trim() : "simcop-tactical-m2m-secure-token-2026";
    }

    public Map<String, Object> getRealPersonnelStatus(String unitId) {
        try {
            String url = getSigepBaseUrl() + "/units/" + unitId + "/personnel-status";
            logger.info("Consultando estado real de personal a SIGEP para la unidad: {}", unitId);

            HttpHeaders headers = new HttpHeaders();
            headers.set("X-Service-Token", getServiceToken());
            headers.set("Authorization", "Bearer " + getServiceToken());
            HttpEntity<Void> requestEntity = new HttpEntity<>(headers);

            ResponseEntity<Map> response = restTemplate.exchange(url, HttpMethod.GET, requestEntity, Map.class);
            return response.getBody();
        } catch (Exception e) {
            logger.warn("Conexión con SIGEP no disponible o unidad {} sin reporte de personal: {}", unitId, e.getMessage());
            return null; // Devuelve nulo si SIGEP está caído para no romper SIMCOP
        }
    }
}

