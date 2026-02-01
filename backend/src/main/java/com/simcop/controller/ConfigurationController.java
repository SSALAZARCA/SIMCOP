package com.simcop.controller;

import com.simcop.service.ConfigurationService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/config")
@CrossOrigin(origins = "*", allowedHeaders = "*")
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
     * In production, add @PreAuthorize("hasRole('ADMINISTRATOR')")
     */
    @GetMapping("/gemini-api-key")
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
     * In production, add @PreAuthorize("hasRole('ADMINISTRATOR')")
     */
    @PostMapping("/gemini-api-key")
    public ResponseEntity<Map<String, String>> saveGeminiApiKey(@RequestBody Map<String, String> request) {
        try {
            String apiKey = request.get("apiKey");
            String username = request.getOrDefault("username", "admin");

            if (apiKey == null || apiKey.trim().isEmpty()) {
                Map<String, String> error = new HashMap<>();
                error.put("error", "API key is required");
                return ResponseEntity.badRequest().body(error);
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
     * In production, add @PreAuthorize("hasRole('ADMINISTRATOR')")
     */
    @DeleteMapping("/gemini-api-key")
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
}
