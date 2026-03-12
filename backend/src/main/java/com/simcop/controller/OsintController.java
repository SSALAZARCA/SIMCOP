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
@Transactional
public class OsintController {

    private static final Logger logger = LoggerFactory.getLogger(OsintController.class);

    @Autowired
    private OsintService osintService;

    @Autowired
    private com.simcop.service.VisibilityService visibilityService;

    @GetMapping("/events")
    public List<OsintEvent> getAllEvents(@RequestHeader(value = "Authorization", required = false) String token) {
        if (token == null)
            return List.of();
        com.simcop.model.User user = visibilityService.getUserFromToken(token);
        if (user == null)
            return List.of();

        String preloadedAo = visibilityService.getPreloadedAoForUser(user);

        return osintService.getAllEvents().stream()
                .filter(e -> visibilityService.isLocationVisibleWithPreloadedAo(e.getLocation(), user, preloadedAo))
                .toList();
    }

    @PostMapping("/refresh")
    @org.springframework.security.access.prepost.PreAuthorize("hasAnyRole('ADMINISTRATOR', 'GESTOR_REPORTES')")
    public ResponseEntity<Map<String, Object>> refreshEvents() {
        try {
            int count = osintService.fetchAndProcessNews();
            logger.info("✅ Refresco OSINT completado: {} eventos procesados.", count);
            return ResponseEntity.ok(Map.of(
                    "status", "success",
                    "processed", count,
                    "message", "OSINT events refreshed successfully"));
        } catch (Exception e) {
            logger.error("❌ Error refrescando eventos OSINT: {}", e.getMessage());
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
}
