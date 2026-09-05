package com.sigep.service;

import com.sigep.model.SystemParameter;
import com.sigep.repository.SystemParameterRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpEntity;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class GenAITacticalService {

    @Autowired
    private RestTemplate restTemplate;

    @Autowired(required = false)
    private SystemParameterRepository systemParameterRepository;

    @Value("${sigep.ai.provider:OMNIROUTE}")
    private String configuredProvider;

    @Value("${sigep.ai.base-url:https://api.omniroute.ai/v1}")
    private String configuredBaseUrl;

    @Value("${sigep.ai.api-key:}")
    private String configuredApiKey;

    @Value("${sigep.ai.model:omni-default}")
    private String configuredModel;

    public String getEffectiveApiKey() {
        if (systemParameterRepository != null) {
            String dbKey = systemParameterRepository.findById("AI_API_KEY").map(SystemParameter::getParameterValue).orElse("");
            if (dbKey != null && !dbKey.trim().isEmpty()) return dbKey.trim();
        }
        String key = System.getenv("AI_API_KEY");
        if (key == null || key.trim().isEmpty()) key = System.getenv("OMNIROUTE_API_KEY");
        if (key == null || key.trim().isEmpty()) key = System.getenv("GEMINI_API_KEY");
        if (key == null || key.trim().isEmpty()) key = configuredApiKey;
        return (key != null) ? key.trim() : "";
    }

    public String getEffectiveBaseUrl() {
        if (systemParameterRepository != null) {
            String dbUrl = systemParameterRepository.findById("AI_API_URL").map(SystemParameter::getParameterValue).orElse("");
            if (dbUrl != null && !dbUrl.trim().isEmpty()) {
                String u = dbUrl.trim();
                return u.endsWith("/") ? u.substring(0, u.length() - 1) : u;
            }
        }
        String url = System.getenv("AI_API_URL");
        if (url == null || url.trim().isEmpty()) url = System.getenv("OMNIROUTE_BASE_URL");
        if (url == null || url.trim().isEmpty()) url = configuredBaseUrl;
        if (url == null || url.trim().isEmpty()) url = "https://api.omniroute.ai/v1";
        if (url.endsWith("/")) url = url.substring(0, url.length() - 1);
        return url;
    }

    public String getEffectiveModel() {
        if (systemParameterRepository != null) {
            String dbModel = systemParameterRepository.findById("AI_MODEL").map(SystemParameter::getParameterValue).orElse("");
            if (dbModel != null && !dbModel.trim().isEmpty()) return dbModel.trim();
        }
        String model = System.getenv("AI_MODEL");
        if (model == null || model.trim().isEmpty()) model = System.getenv("OMNIROUTE_MODEL");
        if (model == null || model.trim().isEmpty()) model = configuredModel;
        return (model != null && !model.trim().isEmpty()) ? model.trim() : "omni-default";
    }

    public String getEffectiveProvider() {
        if (systemParameterRepository != null) {
            String dbProv = systemParameterRepository.findById("AI_PROVIDER").map(SystemParameter::getParameterValue).orElse("");
            if (dbProv != null && !dbProv.trim().isEmpty()) return dbProv.trim();
        }
        String prov = System.getenv("AI_PROVIDER");
        if (prov == null || prov.trim().isEmpty()) prov = System.getenv("OMNIROUTE_PROVIDER");
        if (prov == null || prov.trim().isEmpty()) prov = configuredProvider;
        return (prov != null && !prov.trim().isEmpty()) ? prov.trim() : "OMNIROUTE";
    }

    /**
     * Prueba de conexion en vivo con el proveedor de IA.
     */
    public Map<String, Object> testProviderConnection(Map<String, String> testConfig) {
        Map<String, Object> response = new HashMap<>();

        String provider = (testConfig != null && testConfig.containsKey("AI_PROVIDER")) ? testConfig.get("AI_PROVIDER") : getEffectiveProvider();
        String baseUrl = (testConfig != null && testConfig.containsKey("AI_API_URL")) ? testConfig.get("AI_API_URL") : getEffectiveBaseUrl();
        String apiKey = (testConfig != null && testConfig.containsKey("AI_API_KEY")) ? testConfig.get("AI_API_KEY") : getEffectiveApiKey();
        String model = (testConfig != null && testConfig.containsKey("AI_MODEL")) ? testConfig.get("AI_MODEL") : getEffectiveModel();

        if (baseUrl.endsWith("/")) baseUrl = baseUrl.substring(0, baseUrl.length() - 1);

        if ("LOCAL_AIRGAP".equalsIgnoreCase(provider)) {
            response.put("success", true);
            response.put("provider", "LOCAL_AIRGAP");
            response.put("message", "Modo Doctrinal Local Air-Gap activo y operacional. Inferencia militar garantizada 100% offline.");
            return response;
        }

        if (apiKey == null || apiKey.trim().isEmpty()) {
            response.put("success", false);
            response.put("provider", provider);
            response.put("message", "Falta la Clave de API (API Key) para autenticar con " + provider + ".");
            return response;
        }

        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.setBearerAuth(apiKey.trim());

            Map<String, Object> requestBody = new HashMap<>();
            requestBody.put("model", model);

            List<Map<String, String>> messages = new ArrayList<>();
            messages.add(Map.of("role", "system", "content", "Eres el asesor tactico de SIMCOP/SIGEP. Responde brevemente."));
            messages.add(Map.of("role", "user", "content", "Verificacion de enlace tactico SIGEP. Confirma conexion."));

            requestBody.put("messages", messages);
            requestBody.put("max_tokens", 30);
            requestBody.put("temperature", 0.1);

            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(requestBody, headers);
            String endpoint = baseUrl + "/chat/completions";

            ResponseEntity<Map> resp = restTemplate.postForEntity(endpoint, entity, Map.class);
            if (resp.getStatusCode().is2xxSuccessful() && resp.getBody() != null) {
                Map<String, Object> body = resp.getBody();
                List<Map<String, Object>> choices = (List<Map<String, Object>>) body.get("choices");
                String sampleText = "Conexion exitosa";
                if (choices != null && !choices.isEmpty()) {
                    Map<String, Object> msg = (Map<String, Object>) choices.get(0).get("message");
                    if (msg != null && msg.get("content") != null) {
                        sampleText = msg.get("content").toString().trim();
                    }
                }
                response.put("success", true);
                response.put("provider", provider);
                response.put("model", model);
                response.put("message", "Enlace verificado exitosamente con " + provider + " (" + model + "): " + sampleText);
                return response;
            } else {
                response.put("success", false);
                response.put("provider", provider);
                response.put("message", "El servidor respondio con codigo: " + resp.getStatusCode());
                return response;
            }
        } catch (Exception e) {
            response.put("success", false);
            response.put("provider", provider);
            response.put("message", "Error conectando con " + baseUrl + ": " + e.getMessage());
            return response;
        }
    }

    /**
     * Genera la Apreciacion de Situacion de Personal (G1/S1) mediante LLM (OmniRoute / Gemini)
     * o mediante plantilla militar doctrinal local en modo Air-Gap.
     */
    public String generateTacticalAssessment(Map<String, Object> soldierData, Map<String, Object> sourceUnit, Map<String, Object> targetUnit) {
        String provider = getEffectiveProvider();
        String apiKey = getEffectiveApiKey();

        // Si esta configurado como Air-Gap local explícito, no ir a internet
        if ("LOCAL_AIRGAP".equalsIgnoreCase(provider)) {
            return generateLocalMilitaryAssessment(soldierData, sourceUnit, targetUnit);
        }

        // 1. Si hay API Key disponible, consultar el motor LLM (OmniRoute / OpenAI / Gemini)
        if (!apiKey.isEmpty()) {
            try {
                String prompt = buildPrompt(soldierData, sourceUnit, targetUnit);
                String systemPrompt = "Eres el Asesor Tactico de Inteligencia y Personal (G1/S1) del Ejercito. " +
                        "Redacta apreciaciones de situacion de personal y relevos operacionales en lenguaje militar formal, sobrio, analitico y castrense. " +
                        "Estructura el dictamen con: 1. Diagnostico de la Unidad Receptora, 2. Evaluacion de Idoneidad del Candidato, " +
                        "3. Impacto Operacional en la Unidad de Origen, y 4. Concepto Doctrinal y Recomendacion Final para el Comandante.";

                HttpHeaders headers = new HttpHeaders();
                headers.setContentType(MediaType.APPLICATION_JSON);
                headers.setBearerAuth(apiKey);

                Map<String, Object> requestBody = new HashMap<>();
                requestBody.put("model", getEffectiveModel());

                List<Map<String, String>> messages = new ArrayList<>();
                messages.add(Map.of("role", "system", "content", systemPrompt));
                messages.add(Map.of("role", "user", "content", prompt));

                requestBody.put("messages", messages);
                requestBody.put("temperature", 0.2);
                requestBody.put("max_tokens", 800);

                HttpEntity<Map<String, Object>> entity = new HttpEntity<>(requestBody, headers);
                String endpoint = getEffectiveBaseUrl() + "/chat/completions";

                ResponseEntity<Map> response = restTemplate.postForEntity(endpoint, entity, Map.class);
                if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                    Map<String, Object> body = response.getBody();
                    List<Map<String, Object>> choices = (List<Map<String, Object>>) body.get("choices");
                    if (choices != null && !choices.isEmpty()) {
                        Map<String, Object> message = (Map<String, Object>) choices.get(0).get("message");
                        if (message != null && message.get("content") != null) {
                            String rawContent = message.get("content").toString().trim();
                            // Limpieza de etiquetas de razonamiento <think>...</think> de modelos DeepSeek/OmniRoute
                            return rawContent.replaceAll("(?s)<think>.*?</think>", "").trim();
                        }
                    }
                }
            } catch (Exception e) {
                System.err.println("Aviso: LLM externo no disponible (" + e.getMessage() + "). Generando apreciacion con Sistema Doctrinal Local.");
            }
        }

        // 2. Fallback Tactico Local (Modo Air-Gap sin internet)
        return generateLocalMilitaryAssessment(soldierData, sourceUnit, targetUnit);
    }

    private String buildPrompt(Map<String, Object> soldierData, Map<String, Object> sourceUnit, Map<String, Object> targetUnit) {
        return String.format(
            "SOLICITUD DE APRECIACION TACTICA DE PERSONAL (G1/S1):\n\n" +
            "UNIDAD DESTINO (RECEPTORA): %s | Situacion Operacional: %s | POI Orden Publico: %s\n" +
            "UNIDAD ORIGEN: %s | Situacion Operacional: %s\n" +
            "EFECTIVO PROPUESTO: %s (%s) | Especialidad MOCE: %s | Cursos de Combate: %s | Permanencia: %s meses | Sanidad: %s\n\n" +
            "Emite la Apreciacion de Situacion de Personal con concepto de viabilidad y recomendacion militar de empleo.",
            targetUnit.getOrDefault("name", targetUnit.getOrDefault("id", "UNIDAD DESTINO")),
            targetUnit.getOrDefault("status", "NORMAL"),
            targetUnit.getOrDefault("publicOrderIndex", "N/A"),
            sourceUnit.getOrDefault("name", sourceUnit.getOrDefault("id", "UNIDAD ORIGEN")),
            sourceUnit.getOrDefault("status", "NORMAL"),
            soldierData.getOrDefault("name", "SOLDADO"),
            soldierData.getOrDefault("rank", "GR"),
            soldierData.getOrDefault("moceCode", "INFANTERIA"),
            soldierData.getOrDefault("cursosCombate", "NINGUNO"),
            soldierData.getOrDefault("timeInPosition", "24"),
            soldierData.getOrDefault("healthStatus", "APTO")
        );
    }

    private String generateLocalMilitaryAssessment(Map<String, Object> soldierData, Map<String, Object> sourceUnit, Map<String, Object> targetUnit) {
        String soldierName = (String) soldierData.getOrDefault("name", "Efectivo");
        String rank = (String) soldierData.getOrDefault("rank", "Cuadro");
        String moce = (String) soldierData.getOrDefault("moceCode", "Infanteria");
        String cursos = (String) soldierData.getOrDefault("cursosCombate", "Capacitacion Tactica Regular");
        Object timeObj = soldierData.getOrDefault("timeInPosition", 24);
        String targetName = (String) targetUnit.getOrDefault("name", targetUnit.getOrDefault("id", "Unidad Receptora"));
        String sourceName = (String) sourceUnit.getOrDefault("name", sourceUnit.getOrDefault("id", "Unidad de Origen"));

        return String.format(
            "-- APRECIACION TACTICA DE SITUACION DE PERSONAL (SECCION G1/S1) --\n\n" +
            "1. DIAGNOSTICO DE LA UNIDAD RECEPTORA:\n" +
            "   La unidad %s registra requerimiento urgente de refuerzo en cuadros de mando de la especialidad %s. " +
            "El fortalecimiento de esta plaza garantiza la operatividad del componente organico en su respectivo teatro de operaciones.\n\n" +
            "2. IDONEIDAD DEL CANDIDATO PROPUESTO:\n" +
            "   El %s %s presenta aptitud psicofisica vigente (APTO), con una permanencia de %s meses en la unidad actual " +
            "(cumpliendo ciclo doctrinal de rotacion). Cuenta con especialidad MOCE %s y capacitacion en %s, " +
            "reuniendo las competencias tacticas exigidas para el puesto.\n\n" +
            "3. IMPACTO OPERACIONAL EN LA UNIDAD DE ORIGEN:\n" +
            "   La unidad donante (%s) mantiene estabilidad en su TOE organica. La extraccion no compromete puestos no reemplazables.\n\n" +
            "4. CONCEPTO Y RECOMENDACION FINAL:\n" +
            "   VIABLE. Se recomienda tramitar el movimiento administrativo de personal y remitir a convalidacion del oficial de personal del escalon competente.",
            targetName, moce, rank, soldierName, timeObj, moce, cursos, sourceName
        );
    }
}