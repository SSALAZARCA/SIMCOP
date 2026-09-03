package com.simcop.controller;

import com.simcop.model.OsintEvent;
import com.simcop.service.OsintService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import org.springframework.transaction.annotation.Transactional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/osint")
public class OsintController {

    private static final Logger logger = LoggerFactory.getLogger(OsintController.class);

    @Autowired
    private OsintService osintService;

    @Autowired
    private com.simcop.service.VisibilityService visibilityService;

    @Autowired
    private com.simcop.repository.UserRepository userRepository;

    @GetMapping("/events")
    @org.springframework.security.access.prepost.PreAuthorize("isAuthenticated()")
    public List<OsintEvent> getAllEvents() {
        org.springframework.security.core.Authentication auth = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || "anonymousUser".equals(auth.getName())) {
            return List.of();
        }
        com.simcop.model.User user = userRepository.findByUsername(auth.getName()).orElse(null);
        if (user == null) {
            return List.of();
        }

        String preloadedAo = visibilityService.getPreloadedAoForUser(user);

        return osintService.getAllEvents().stream()
                .filter(e -> visibilityService.isLocationVisibleWithPreloadedAo(e.getLocation(), user, preloadedAo))
                .toList();
    }

    @PostMapping("/refresh")
    @org.springframework.security.access.prepost.PreAuthorize("hasAnyRole('ADMINISTRATOR', 'GESTOR_REPORTES')")
    public ResponseEntity<Map<String, Object>> refreshEvents() {
        try {
            osintService.fetchAndProcessNewsAsync();
            logger.info("📡 Refresco OSINT iniciado de forma asíncrona.");
            return ResponseEntity.status(org.springframework.http.HttpStatus.ACCEPTED).body(Map.of(
                    "status", "PROCESSING",
                    "message", "OSINT refresh initiated asynchronously"));
        } catch (Exception e) {
            logger.error("❌ Error iniciando refresco OSINT: {}", e.getMessage());
            return ResponseEntity.internalServerError().body(Map.of("error", e.getMessage()));
        }
    }

    @PatchMapping("/events/{id}/verify")
    @org.springframework.security.access.prepost.PreAuthorize("hasAnyRole('ADMINISTRATOR', 'GESTOR_REPORTES')")
    public ResponseEntity<OsintEvent> verifyEvent(@PathVariable String id, @RequestBody Map<String, Boolean> request) {
        try {
            boolean verified = request.getOrDefault("verified", true);
            @SuppressWarnings("null")
            OsintEvent updated = osintService.setVerified(id, verified);
            logger.info("✅ Evento OSINT {} verificado: {}", id, verified);
            return ResponseEntity.ok(updated);
        } catch (Exception e) {
            logger.error("❌ Error verificando evento OSINT {}: {}", id, e.getMessage());
            return ResponseEntity.badRequest().build();
        }
    }

    @org.springframework.beans.factory.annotation.Value("${app.osint.webhook-secret:${OSINT_WEBHOOK_SECRET:}}")
    private String configuredWebhookSecret;

    @PostMapping("/webhook")
    public ResponseEntity<Map<String, Object>> receiveExternalWebhook(
            @RequestHeader(value = "X-Webhook-Token", required = false) String token,
            @RequestBody Map<String, String> payload) {
        
        String envSecret = System.getenv("OSINT_WEBHOOK_SECRET");
        String expectedToken = (envSecret != null && !envSecret.trim().isEmpty()) 
                ? envSecret.trim() 
                : (configuredWebhookSecret != null ? configuredWebhookSecret.trim() : "");
        
        if (expectedToken.isEmpty() || token == null) {
            logger.warn("❌ Intento de acceso no autorizado al webhook OSINT");
            return ResponseEntity.status(401).body(Map.of("error", "Unauthorized webhook access"));
        }

        byte[] tokenBytes = token.getBytes(java.nio.charset.StandardCharsets.UTF_8);
        byte[] expectedBytes = expectedToken.getBytes(java.nio.charset.StandardCharsets.UTF_8);

        if (!java.security.MessageDigest.isEqual(tokenBytes, expectedBytes)) {
            logger.warn("❌ Intento de acceso no autorizado al webhook OSINT (token inválido)");
            return ResponseEntity.status(401).body(Map.of("error", "Unauthorized webhook access"));
        }

        try {
            String rawText = payload.get("raw_text");
            if (rawText == null || rawText.isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("error", "Missing raw_text in payload"));
            }

            OsintEvent event = osintService.processExternalWebhook(rawText);
            if (event != null) {
                logger.info("✅ Evento OSINT externo procesado y guardado exitosamente");
                return ResponseEntity.ok(Map.of("status", "success", "event_id", event.getId()));
            } else {
                return ResponseEntity.badRequest().body(Map.of("error", "Could not parse event data from raw_text"));
            }
        } catch (Exception e) {
            logger.error("❌ Error procesando webhook OSINT: {}", e.getMessage());
            return ResponseEntity.internalServerError().body(Map.of("error", e.getMessage()));
        }
    }
}
