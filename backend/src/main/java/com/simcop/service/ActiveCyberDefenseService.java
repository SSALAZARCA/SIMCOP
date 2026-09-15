package com.simcop.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.simcop.model.AdminAuditLog;
import com.simcop.model.Alert;
import com.simcop.model.AlertSeverity;
import com.simcop.model.AlertType;
import com.simcop.repository.AdminAuditLogRepository;
import com.simcop.repository.AlertRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

/**
 * Central coordinator for Active Cyber Defense (ACD).
 * Isolates offending IPs, logs forensic audit trails, generates C2 alerts,
 * and dispatches priority notifications to the Superadministrator via Telegram.
 */
@Service
public class ActiveCyberDefenseService {

    private static final Logger logger = LoggerFactory.getLogger(ActiveCyberDefenseService.class);

    private final AlertRepository alertRepository;
    private final AdminAuditLogRepository auditLogRepository;
    private final LoginRateLimiterService loginRateLimiterService;
    private final TelegramService telegramService;
    private final ObjectMapper objectMapper;

    @Autowired
    public ActiveCyberDefenseService(
            @Autowired(required = false) AlertRepository alertRepository,
            @Autowired(required = false) AdminAuditLogRepository auditLogRepository,
            @Autowired(required = false) LoginRateLimiterService loginRateLimiterService,
            @Autowired(required = false) TelegramService telegramService) {
        this.alertRepository = alertRepository;
        this.auditLogRepository = auditLogRepository;
        this.loginRateLimiterService = loginRateLimiterService;
        this.telegramService = telegramService;
        this.objectMapper = new ObjectMapper();
    }

    /**
     * Coordinates active cyber defense responses upon detecting offensive activity.
     *
     * @param vector          The detected attack vector (e.g. IMPOSSIBLE_TRAVEL, DLP_SCRAPING_BURST, RASP_ATTACK)
     * @param clientIp        The IP of the attacker or anomalous client
     * @param username        The user account associated with the event (if known)
     * @param details         Forensic telemetry and parameters
     * @param defensiveAction The defensive containment executed (e.g. SESSION_REVOKED, IP_ISOLATED_24H)
     * @return The persisted Alert entity
     */
    public Alert recordIntrusionAlert(String vector, String clientIp, String username, String details, String defensiveAction) {
        logger.warn("🛡️ [ACD_COORDINATOR] Recording cyber intrusion: Vector={}, IP={}, User={}, Action={}",
                vector, clientIp, username, defensiveAction);

        // 1. Isolate IP for 24 hours in LoginRateLimiterService
        if (loginRateLimiterService != null && clientIp != null && !clientIp.trim().isEmpty()) {
            try {
                loginRateLimiterService.blacklistIp(clientIp, 24 * 3600 * 1000L, vector + ": " + defensiveAction);
            } catch (Exception e) {
                logger.error("Error isolating IP in rate limiter: {}", e.getMessage());
            }
        }

        // 2. Persist AdminAuditLog entry
        if (auditLogRepository != null) {
            try {
                AdminAuditLog auditLog = new AdminAuditLog(
                        System.currentTimeMillis(),
                        "ACTIVE_CYBER_DEFENSE",
                        "CYBER_INTRUSION_DETECTED",
                        clientIp != null ? clientIp : "UNKNOWN",
                        String.format("Vector: %s | User: %s | Action: %s | Details: %s", vector, username, defensiveAction, details)
                );
                auditLogRepository.save(auditLog);
            } catch (Exception e) {
                logger.error("Error persisting ACD audit log: {}", e.getMessage());
            }
        }

        // 3. Build and persist Alert in AlertRepository
        Alert alert = new Alert();
        alert.setId(UUID.randomUUID().toString());
        alert.setType(AlertType.CYBER_INTRUSION_DETECTED);
        alert.setSeverity(AlertSeverity.CRITICAL);
        alert.setTimestamp(System.currentTimeMillis());
        alert.setAcknowledged(false);
        alert.setUserId(username);
        alert.setMessage(String.format("INTRUSIÓN CIBERNÉTICA DETECTADA [%s]: %s (IP: %s)", vector, details, clientIp));

        Map<String, Object> forensicMap = new HashMap<>();
        forensicMap.put("vector", vector);
        forensicMap.put("ip", clientIp);
        forensicMap.put("username", username);
        forensicMap.put("details", details);
        forensicMap.put("action", defensiveAction);
        forensicMap.put("timestamp", alert.getTimestamp());

        try {
            alert.setData(objectMapper.writeValueAsString(forensicMap));
        } catch (Exception e) {
            alert.setData(String.format("{\"vector\":\"%s\",\"ip\":\"%s\",\"action\":\"%s\"}", vector, clientIp, defensiveAction));
        }

        Alert savedAlert = alert;
        if (alertRepository != null) {
            try {
                savedAlert = alertRepository.save(alert);
                logger.info("✅ Alerta ACD C2 registrada exitosamente: ID={}", savedAlert.getId());
            } catch (Exception e) {
                logger.error("Error persisting ACD Alert: {}", e.getMessage());
            }
        }

        // 4. Dispatch priority Telegram notification to Superadministrator
        if (telegramService != null) {
            try {
                telegramService.sendCyberIntrusionAlert(savedAlert);
            } catch (Exception e) {
                logger.error("Error sending Telegram cyber intrusion notification: {}", e.getMessage());
            }
        }

        return savedAlert;
    }
}
