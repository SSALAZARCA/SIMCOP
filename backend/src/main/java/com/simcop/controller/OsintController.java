package com.simcop.controller;

import com.simcop.model.OsintEvent;
import com.simcop.service.OsintService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/osint")
@CrossOrigin(origins = "*")
public class OsintController {

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
        int count = osintService.fetchAndProcessNews();
        return ResponseEntity.ok(Map.of(
                "status", "success",
                "processed", count,
                "message", "OSINT events refreshed successfully"));
    }

    @PatchMapping("/events/{id}/verify")
    @org.springframework.security.access.prepost.PreAuthorize("hasAnyRole('ADMINISTRATOR', 'GESTOR_REPORTES')")
    public ResponseEntity<OsintEvent> verifyEvent(@PathVariable String id, @RequestBody Map<String, Boolean> request) {
        boolean verified = request.getOrDefault("verified", true);
        @SuppressWarnings("null")
        OsintEvent updated = osintService.setVerified(id, verified);
        return ResponseEntity.ok(updated);
    }
}
