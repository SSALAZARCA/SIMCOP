package com.simcop.service;

import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import java.util.Map;

@Service
public class SigepIntegrationService {

    private static final Logger logger = LoggerFactory.getLogger(SigepIntegrationService.class);
    private final RestTemplate restTemplate = new RestTemplate();
    
    // Asumiendo que SIGEP backend corre en puerto 4000
    private static final String SIGEP_BASE_URL = "http://localhost:4000/api/simcop";

    public Map<String, Object> getRealPersonnelStatus(String unitId) {
        try {
            String url = SIGEP_BASE_URL + "/units/" + unitId + "/personnel-status";
            logger.info("Consultando estado real de personal a SIGEP para la unidad: {}", unitId);
            Map<String, Object> response = restTemplate.getForObject(url, Map.class);
            return response;
        } catch (Exception e) {
            logger.error("Error al conectar con SIGEP para obtener reporte real: {}", e.getMessage());
            return null; // Devuelve nulo si SIGEP está caído para no romper SIMCOP
        }
    }
}
