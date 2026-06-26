package com.simcop.controller;

import com.simcop.service.ConfigurationService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/config")
public class ConfigurationController {

    @Autowired
    private ConfigurationService configService;

    /**
     * Check if Gemini API key is configured (public endpoint)
     */
    @GetMapping("/gemini-api-key/status")
    public ResponseEntity<Map<String, Boolean>> getGeminiApiKeyStatus() {
        try {
            Map<String, Boolean> response = new HashMap<>();
            response.put("configured", configService.hasGeminiApiKey());
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            // If there's a database error, return false
            Map<String, Boolean> response = new HashMap<>();
            response.put("configured", false);
            return ResponseEntity.ok(response);
        }
    }

    /**
     * Get Gemini API key (admin only)
     */
    @GetMapping("/gemini-api-key")
    @org.springframework.security.access.prepost.PreAuthorize("hasAnyRole('ADMINISTRATOR', 'COMANDANTE_EJERCITO', 'COMANDANTE_DIVISION', 'COMANDANTE_BRIGADA', 'COMANDANTE_BATALLON', 'OFICIAL_INTELIGENCIA')")
    public ResponseEntity<Map<String, String>> getGeminiApiKey() {
        return configService.getGeminiApiKey()
                .map(apiKey -> {
                    Map<String, String> response = new HashMap<>();
                    response.put("apiKey", apiKey);
                    return ResponseEntity.ok(response);
                })
                .orElse(ResponseEntity.notFound().build());
    }

    /**
     * Save Gemini API key (admin only)
     */
    @PostMapping("/gemini-api-key")
    @org.springframework.security.access.prepost.PreAuthorize("hasRole('ADMINISTRATOR')")
    public ResponseEntity<Map<String, String>> saveGeminiApiKey(@RequestBody Map<String, String> request) {
        try {
            String apiKey = request.get("apiKey");
            String username = request.getOrDefault("username", "admin");

            if (apiKey == null || apiKey.trim().isEmpty()) {
                // If it's empty, we treat it as deleting the key since it's optional for LMLink
                configService.deleteGeminiApiKey();
                Map<String, String> response = new HashMap<>();
                response.put("message", "API key cleared successfully");
                return ResponseEntity.ok(response);
            }

            configService.saveGeminiApiKey(apiKey, username);

            Map<String, String> response = new HashMap<>();
            response.put("message", "API key saved successfully");
            return ResponseEntity.ok(response);

        } catch (IllegalArgumentException e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(error);
        } catch (Exception e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", "Failed to save API key: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error);
        }
    }

    /**
     * Delete Gemini API key (admin only)
     */
    @DeleteMapping("/gemini-api-key")
    @org.springframework.security.access.prepost.PreAuthorize("hasRole('ADMINISTRATOR')")
    public ResponseEntity<Map<String, String>> deleteGeminiApiKey() {
        try {
            configService.deleteGeminiApiKey();
            Map<String, String> response = new HashMap<>();
            response.put("message", "API key deleted successfully");
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", "Failed to delete API key: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error);
        }
    }

    /**
     * Telegram Configuration
     */
    @GetMapping("/telegram")
    @PreAuthorize("hasRole('ADMINISTRATOR')")
    public ResponseEntity<Map<String, Object>> getTelegramStatus() {
        Map<String, Object> response = new HashMap<>();
        response.put("configured", configService.getTelegramBotToken() != null);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/telegram")
    @PreAuthorize("hasRole('ADMINISTRATOR')")
    public ResponseEntity<Map<String, String>> saveTelegramToken(
            @RequestBody Map<String, String> payload,
            @RequestHeader("Authorization") String token) {
        
        String botToken = payload.get("token");
        Map<String, String> response = new HashMap<>();
        
        if (botToken == null || botToken.trim().isEmpty()) {
            response.put("error", "Bot Token is required");
            return ResponseEntity.badRequest().body(response);
        }

        try {
            String username = payload.getOrDefault("username", "admin");
            configService.saveTelegramBotToken(botToken, username);
            response.put("message", "Telegram Bot Token saved successfully");
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            response.put("error", "Failed to save token: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    @GetMapping("/telegram/comms")
    @PreAuthorize("hasRole('ADMINISTRATOR')")
    public ResponseEntity<Map<String, Object>> getTelegramCommsStatus() {
        Map<String, Object> response = new HashMap<>();
        response.put("configured", configService.getTelegramBotTokenComms() != null);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/telegram/comms")
    @PreAuthorize("hasRole('ADMINISTRATOR')")
    public ResponseEntity<Map<String, String>> saveTelegramCommsToken(
            @RequestBody Map<String, String> payload,
            @RequestHeader("Authorization") String token) {
        
        String botToken = payload.get("token");
        Map<String, String> response = new HashMap<>();
        
        if (botToken == null || botToken.trim().isEmpty()) {
            response.put("error", "Bot Token is required");
            return ResponseEntity.badRequest().body(response);
        }

        try {
            String username = payload.getOrDefault("username", "admin");
            configService.saveTelegramBotTokenComms(botToken, username);
            response.put("message", "Telegram Communications Bot Token saved successfully");
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            response.put("error", "Failed to save comms token: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    /**
     * AI Provider methods
     */
    @GetMapping("/ai-provider")
    public ResponseEntity<Map<String, String>> getAIProvider() {
        Map<String, String> response = new HashMap<>();
        response.put("provider", configService.getAIProvider());
        response.put("localEndpoint", configService.getLocalAIEndpoint());
        response.put("localModel", configService.getLocalAIModel());
        return ResponseEntity.ok(response);
    }

    /**
     * Save AI provider configuration (admin only)
     */
    @PostMapping("/ai-provider")
    @org.springframework.security.access.prepost.PreAuthorize("hasRole('ADMINISTRATOR')")
    public ResponseEntity<Map<String, String>> saveAIProvider(@RequestBody Map<String, String> request) {
        try {
            String provider = request.getOrDefault("provider", "GEMINI");
            String localEndpoint = request.getOrDefault("localEndpoint", "http://localhost:11434");
            String localModel = request.getOrDefault("localModel", "llama3");
            String username = request.getOrDefault("username", "admin");

            configService.saveAIProvider(provider, username);
            configService.saveLocalAIEndpoint(localEndpoint, username);
            configService.saveLocalAIModel(localModel, username);

            Map<String, String> response = new HashMap<>();
            response.put("message", "AI provider configuration saved successfully");
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", "Failed to save AI provider configuration: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error);
        }
    }
}
