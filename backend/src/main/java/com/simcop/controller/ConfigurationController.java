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
     * Get Gemini API key (admin only) - masked to prevent cleartext secret leakage
     */
    @GetMapping("/gemini-api-key")
    @org.springframework.security.access.prepost.PreAuthorize("hasRole('ADMINISTRATOR')")
    public ResponseEntity<Map<String, Object>> getGeminiApiKey() {
        return configService.getGeminiApiKey()
                .map(apiKey -> {
                    Map<String, Object> response = new HashMap<>();
                    String masked = maskApiKey(apiKey);
                    response.put("configured", true);
                    response.put("apiKey", masked);
                    response.put("maskedKey", masked);
                    return ResponseEntity.ok(response);
                })
                .orElse(ResponseEntity.notFound().build());
    }

    /**
     * Save Gemini API key (admin only)
     * Guards against overwriting real secret if masked key or empty string is submitted
     */
    @PostMapping("/gemini-api-key")
    @org.springframework.security.access.prepost.PreAuthorize("hasRole('ADMINISTRATOR')")
    public ResponseEntity<Map<String, String>> saveGeminiApiKey(@RequestBody Map<String, String> request) {
        try {
            String apiKey = request.get("apiKey");
            org.springframework.security.core.Authentication auth = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
            String username = (auth != null && auth.isAuthenticated() && !auth.getName().equals("anonymousUser")) ? auth.getName() : "system";

            if (apiKey == null || apiKey.trim().isEmpty() || apiKey.contains("****") || apiKey.contains("***")) {
                // If empty or masked, retain existing key without overwriting
                Map<String, String> response = new HashMap<>();
                response.put("message", "Existing API key preserved");
                return ResponseEntity.ok(response);
            }

            configService.saveGeminiApiKey(apiKey.trim(), username);

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
            @RequestBody Map<String, String> payload) {
        
        String botToken = payload.get("token");
        Map<String, String> response = new HashMap<>();
        
        if (botToken == null || botToken.trim().isEmpty()) {
            response.put("error", "Bot Token is required");
            return ResponseEntity.badRequest().body(response);
        }

        try {
            org.springframework.security.core.Authentication auth = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
            String username = (auth != null && auth.isAuthenticated() && !auth.getName().equals("anonymousUser")) ? auth.getName() : "system";
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
            @RequestBody Map<String, String> payload) {
        
        String botToken = payload.get("token");
        Map<String, String> response = new HashMap<>();
        
        if (botToken == null || botToken.trim().isEmpty()) {
            response.put("error", "Bot Token is required");
            return ResponseEntity.badRequest().body(response);
        }

        try {
            org.springframework.security.core.Authentication auth = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
            String username = (auth != null && auth.isAuthenticated() && !auth.getName().equals("anonymousUser")) ? auth.getName() : "system";
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
     * Sanitized to protect internal network topology and internal IPs (e.g. 72.62.130.152)
     */
    @GetMapping("/ai-provider")
    public ResponseEntity<Map<String, String>> getAIProvider() {
        Map<String, String> response = new HashMap<>();
        response.put("provider", configService.getAIProvider());

        org.springframework.security.core.Authentication auth = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
        boolean isAdmin = auth != null && auth.isAuthenticated() && auth.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_ADMINISTRATOR") || a.getAuthority().equals("ADMINISTRATOR"));

        String rawEndpoint = configService.getLocalAIEndpoint();
        if (!isAdmin) {
            // Non-administrators never see internal IPs or ports
            response.put("localEndpoint", (rawEndpoint != null && !rawEndpoint.trim().isEmpty()) ? "[CONFIGURED_INTERNAL]" : "");
        } else {
            // Administrators see masked IP octets to verify host configuration without cleartext exposure
            response.put("localEndpoint", maskEndpointForAdmin(rawEndpoint));
        }

        response.put("localModel", configService.getLocalAIModel());
        return ResponseEntity.ok(response);
    }

    /**
     * Save AI provider configuration (admin only)
     * Protects internal endpoints from being overwritten with masked representations
     */
    @PostMapping("/ai-provider")
    @org.springframework.security.access.prepost.PreAuthorize("hasRole('ADMINISTRATOR')")
    public ResponseEntity<Map<String, String>> saveAIProvider(@RequestBody Map<String, String> request) {
        try {
            String provider = request.getOrDefault("provider", "GEMINI");
            String localEndpoint = request.get("localEndpoint");
            String localModel = request.getOrDefault("localModel", "llama3");
            org.springframework.security.core.Authentication auth = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
            String username = (auth != null && auth.isAuthenticated() && !auth.getName().equals("anonymousUser")) ? auth.getName() : "system";

            configService.saveAIProvider(provider, username);

            // If localEndpoint contains [CONFIGURED_INTERNAL] or asterisks, retain existing value in database
            if (localEndpoint != null && !localEndpoint.trim().isEmpty()
                    && !localEndpoint.contains("[CONFIGURED_INTERNAL]")
                    && !localEndpoint.contains("***")) {
                configService.saveLocalAIEndpoint(localEndpoint.trim(), username);
            }

            if (localModel != null && !localModel.trim().isEmpty()) {
                configService.saveLocalAIModel(localModel.trim(), username);
            }

            Map<String, String> response = new HashMap<>();
            response.put("message", "AI provider configuration saved successfully");
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", "Failed to save AI provider configuration: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error);
        }
    }

    private String maskApiKey(String key) {
        if (key == null || key.trim().isEmpty()) {
            return "";
        }
        String trimmed = key.trim();
        if (trimmed.length() <= 6) {
            return "****";
        }
        return trimmed.substring(0, 6) + "...****";
    }

    private String maskEndpointForAdmin(String endpoint) {
        if (endpoint == null || endpoint.trim().isEmpty()) {
            return "";
        }
        // Mask IPv4 octets e.g. 72.62.130.152 -> 72.62.***.***
        return endpoint.replaceAll("(\\b\\d{1,3}\\.\\d{1,3})\\.\\d{1,3}\\.\\d{1,3}\\b", "$1.***.***");
    }
}
