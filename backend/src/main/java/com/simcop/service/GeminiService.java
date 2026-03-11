package com.simcop.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.*;

@Service
public class GeminiService {

    @Autowired
    private ConfigurationService configService;

    private final RestTemplate restTemplate = new RestTemplate();
    private static final String GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=";

    public String generateContent(String prompt) {
        String apiKey = configService.getGeminiApiKey()
                .orElseThrow(() -> new IllegalStateException("Gemini API Key not configured in backend"));

        String url = GEMINI_API_URL + apiKey;

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);

        Map<String, Object> requestBody = new HashMap<>();
        Map<String, Object> content = new HashMap<>();
        Map<String, Object> part = new HashMap<>();
        part.put("text", prompt);
        content.put("parts", Collections.singletonList(part));
        requestBody.put("contents", Collections.singletonList(content));

        // Use a simpler generation config for faster JSON responses
        Map<String, Object> generationConfig = new HashMap<>();
        generationConfig.put("response_mime_type", "application/json");
        requestBody.put("generationConfig", generationConfig);

        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(requestBody, headers);

        try {
            ResponseEntity<Map<String, Object>> response = restTemplate.exchange(url,
                    org.springframework.http.HttpMethod.POST, entity,
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
                    return (String) parts.get(0).get("text");
                }
            }
        } catch (Exception e) {
            System.err.println("Error calling Gemini API: " + e.getMessage());
        }

        return null;
    }
}
