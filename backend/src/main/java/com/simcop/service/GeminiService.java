package com.simcop.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.web.client.RestTemplateBuilder;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.time.Duration;
import java.util.*;

@Service
public class GeminiService {

    private static final Logger logger = LoggerFactory.getLogger(GeminiService.class);

    @Autowired
    private ConfigurationService configService;

    // Timeout configurado a 60 segundos
    private final RestTemplate restTemplate = new RestTemplateBuilder()
            .setConnectTimeout(Duration.ofSeconds(15))
            .setReadTimeout(Duration.ofSeconds(60))
            .build();
    private static final String GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent";

    public String generateContent(String prompt) {
        String provider = configService.getAIProvider();

        if ("LOCAL_OLLAMA".equalsIgnoreCase(provider)) {
            String endpoint = configService.getLocalAIEndpoint();
            String model = configService.getLocalAIModel();
            String url = endpoint + "/api/generate";

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);

            Map<String, Object> requestBody = new HashMap<>();
            requestBody.put("model", model);
            requestBody.put("prompt", prompt);
            requestBody.put("stream", false);
            
            // Si el prompt exige estrictamente JSON (como en el generador de COA o OSINT), forzamos el modo JSON nativo de Ollama
            if (prompt != null && (prompt.contains("estructura exacta. REGLAS") || prompt.contains("Responde en formato JSON"))) {
                requestBody.put("format", "json");
            }

            Map<String, Object> options = new HashMap<>();
            options.put("temperature", 0.4);
            options.put("top_p", 0.9);
            // GPU: offload máximo de capas. KV cache reducido para evitar OOM con modelos >7B
            options.put("num_gpu", 99);        // fuerza max capas en GPU
            options.put("num_thread", 8);       // threads CPU para capas residuales
            options.put("num_ctx", 4096);       // 4096 es suficiente para análisis y evita OOM en 12GB VRAM
            options.put("num_batch", 256);      // batch reducido para aliviar picos de memoria
            options.put("f16_kv", true);        // KV cache fp16 → mitad de VRAM que fp32
            options.put("num_keep", 48);        // mantener primeros tokens del sistema en cache
            requestBody.put("options", options);

            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(requestBody, headers);

            try {
                @SuppressWarnings("null")
                ResponseEntity<Map<String, Object>> response = restTemplate.exchange(url,
                        HttpMethod.POST, entity,
                        new org.springframework.core.ParameterizedTypeReference<Map<String, Object>>() {
                        });
                Map<String, Object> body = response.getBody();
                if (response.getStatusCode() == HttpStatus.OK && body != null) {
                    return stripReasoningTags((String) body.get("response"));
                }
            } catch (Exception e) {
                logger.error("Error calling Local Ollama API at {}: {}", url, e.getMessage());
                return "Error llamando a la IA Local (Ollama) en " + url + ": " + e.getMessage();
            }
            return null;
        } else if ("LOCAL_LMLINK".equalsIgnoreCase(provider)) {
            String endpoint = configService.getLocalAIEndpoint();
            String model = configService.getLocalAIModel();
            
            // LMLink/LMStudio uses the OpenAI format
            String url = endpoint + "/v1/chat/completions";

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            
            // Allow user to use the Gemini API Key field as the LMLink Auth Token if required by their tailnet
            Optional<String> apiKeyOpt = configService.getGeminiApiKey();
            if (apiKeyOpt.isPresent() && !apiKeyOpt.get().trim().isEmpty()) {
                headers.setBearerAuth(apiKeyOpt.get().trim());
            }

            Map<String, Object> requestBody = new HashMap<>();
            requestBody.put("model", model);
            requestBody.put("temperature", 0.4);

            // LM Studio JSON mode if requested by the tactical prompt
            if (prompt != null && (prompt.contains("estructura exacta. REGLAS") || prompt.contains("Responde en formato JSON"))) {
                Map<String, Object> responseFormat = new HashMap<>();
                responseFormat.put("type", "json_object");
                requestBody.put("response_format", responseFormat);
            }

            Map<String, Object> systemMessage = new HashMap<>();
            systemMessage.put("role", "system");
            systemMessage.put("content", "You are an expert military tactical planner.");

            Map<String, Object> userMessage = new HashMap<>();
            userMessage.put("role", "user");
            userMessage.put("content", prompt);

            requestBody.put("messages", java.util.Arrays.asList(systemMessage, userMessage));

            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(requestBody, headers);

            try {
                @SuppressWarnings("null")
                ResponseEntity<Map<String, Object>> response = restTemplate.exchange(url,
                        HttpMethod.POST, entity,
                        new org.springframework.core.ParameterizedTypeReference<Map<String, Object>>() {
                        });
                Map<String, Object> body = response.getBody();
                if (response.getStatusCode() == HttpStatus.OK && body != null) {
                    @SuppressWarnings("unchecked")
                    java.util.List<Map<String, Object>> choices = (java.util.List<Map<String, Object>>) body.get("choices");
                    if (choices != null && !choices.isEmpty()) {
                        @SuppressWarnings("unchecked")
                        Map<String, Object> message = (Map<String, Object>) choices.get(0).get("message");
                        if (message != null) {
                            return stripReasoningTags((String) message.get("content"));
                        }
                    }
                }
            } catch (Exception e) {
                logger.error("Error calling LMLink API at {}: {}", url, e.getMessage());
                return "Error llamando a LMLink en " + url + ": " + e.getMessage();
            }
            return null;
        } else if ("OMNIROUTE".equalsIgnoreCase(provider)) {
            String endpoint = configService.getLocalAIEndpoint();
            if (endpoint == null || endpoint.trim().isEmpty()) {
                endpoint = "https://api.omniroute.ai/v1";
            }
            endpoint = endpoint.trim().replaceAll("/+$", "");
            String url = endpoint.endsWith("/v1") ? endpoint + "/chat/completions" : endpoint + "/v1/chat/completions";

            String model = configService.getLocalAIModel();
            if (model == null || model.trim().isEmpty()) {
                model = "omni-default";
            } else {
                model = model.trim();
            }

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);

            Optional<String> apiKeyOpt = configService.getGeminiApiKey();
            if (apiKeyOpt.isPresent() && !apiKeyOpt.get().trim().isEmpty()) {
                String key = apiKeyOpt.get().trim();
                headers.setBearerAuth(key.startsWith("Bearer ") ? key.substring(7).trim() : key);
            }

            Map<String, Object> requestBody = new HashMap<>();
            requestBody.put("model", model);
            requestBody.put("temperature", 0.4);

            if (prompt != null && (prompt.contains("estructura exacta. REGLAS") || prompt.contains("Responde en formato JSON"))) {
                Map<String, Object> responseFormat = new HashMap<>();
                responseFormat.put("type", "json_object");
                requestBody.put("response_format", responseFormat);
            }

            Map<String, Object> systemMessage = new HashMap<>();
            systemMessage.put("role", "system");
            systemMessage.put("content", "You are an expert military tactical planner.");

            Map<String, Object> userMessage = new HashMap<>();
            userMessage.put("role", "user");
            userMessage.put("content", prompt);

            requestBody.put("messages", java.util.Arrays.asList(systemMessage, userMessage));

            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(requestBody, headers);

            try {
                @SuppressWarnings("null")
                ResponseEntity<Map<String, Object>> response = restTemplate.exchange(url,
                        HttpMethod.POST, entity,
                        new org.springframework.core.ParameterizedTypeReference<Map<String, Object>>() {
                        });
                Map<String, Object> body = response.getBody();
                if (response.getStatusCode() == HttpStatus.OK && body != null) {
                    @SuppressWarnings("unchecked")
                    java.util.List<Map<String, Object>> choices = (java.util.List<Map<String, Object>>) body.get("choices");
                    if (choices != null && !choices.isEmpty()) {
                        @SuppressWarnings("unchecked")
                        Map<String, Object> message = (Map<String, Object>) choices.get(0).get("message");
                        if (message != null) {
                            String content = (String) message.get("content");
                            return stripReasoningTags(content);
                        }
                    }
                }
            } catch (Exception e) {
                logger.error("Error calling OmniRoute API at {}: {}", url, e.getMessage());
                return "Error llamando a OmniRoute en " + url + ": " + e.getMessage();
            }
            return null;
        }

        String apiKey = configService.getGeminiApiKey()
                .orElseThrow(() -> new IllegalStateException("Gemini API Key not configured in backend"));

        String url = GEMINI_API_URL;

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.set("x-goog-api-key", apiKey);

        Map<String, Object> requestBody = new HashMap<>();
        Map<String, Object> content = new HashMap<>();
        Map<String, Object> part = new HashMap<>();
        part.put("text", prompt);
        content.put("parts", Collections.singletonList(part));
        requestBody.put("contents", Collections.singletonList(content));

        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(requestBody, headers);

        try {
            @SuppressWarnings("null")
            ResponseEntity<Map<String, Object>> response = restTemplate.exchange(url,
                    HttpMethod.POST, entity,
                    new org.springframework.core.ParameterizedTypeReference<Map<String, Object>>() {
                    });
            Map<String, Object> body = response.getBody();
            if (response.getStatusCode() == HttpStatus.OK && body != null) {
                @SuppressWarnings("unchecked")
                List<Map<String, Object>> candidates = (List<Map<String, Object>>) body.get("candidates");
                if (candidates != null && !candidates.isEmpty()) {
                    @SuppressWarnings("unchecked")
                    Map<String, Object> contentMap = (Map<String, Object>) candidates.get(0).get("content");
                    @SuppressWarnings("unchecked")
                    List<Map<String, Object>> parts = (List<Map<String, Object>>) contentMap.get("parts");
                    return stripReasoningTags((String) parts.get(0).get("text"));
                }
            }
        } catch (Exception e) {
            logger.error("Error calling Gemini API: {}", e.getMessage());
        }

        return null;
    }

    /**
     * Thoroughly strips reasoning and deep thinking tags (<think>...</think>, <thought>...</thought>,
     * <thinking>...</thinking>, <reasoning>...</reasoning>) from model outputs, including nested,
     * unclosed, and multiline tokens, preventing downstream JSON parse crashes.
     */
    public static String stripReasoningTags(String raw) {
        if (raw == null || raw.isEmpty()) {
            return "";
        }
        String result = raw;
        // Iteratively strip think/thought/thinking/reasoning tags to handle nested blocks
        while (result.matches("(?is).*<(think|thought|thinking|reasoning)>.*?</\\1>.*")) {
            result = result.replaceAll("(?is)<(think|thought|thinking|reasoning)>.*?</\\1>", "");
        }
        // Handle unclosed tags or cutoffs
        result = result.replaceAll("(?is)<(think|thought|thinking|reasoning)>.*$", "");
        result = result.replaceAll("(?is)^.*?<\\/(think|thought|thinking|reasoning)>", "");
        result = result.replaceAll("(?is)<\\/(think|thought|thinking|reasoning)>", "");
        return result.trim();
    }
}
