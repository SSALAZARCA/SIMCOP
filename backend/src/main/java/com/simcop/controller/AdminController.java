package com.simcop.controller;

import com.simcop.dto.AdminTableActionRequest;
import com.simcop.dto.DatabaseStatsDTO;
import com.simcop.model.AdminAuditLog;
import com.simcop.repository.AdminAuditLogRepository;
import com.simcop.service.TwoFactorService;
import com.simcop.model.User;
import com.simcop.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin")
@PreAuthorize("hasRole('ADMINISTRATOR')")
public class AdminController {

    private static final Logger logger = LoggerFactory.getLogger(AdminController.class);

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Autowired
    private AdminAuditLogRepository auditLogRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private TwoFactorService twoFactorService;

    @GetMapping("/stats")
    public ResponseEntity<DatabaseStatsDTO> getDatabaseStats() {
        DatabaseStatsDTO stats = new DatabaseStatsDTO();
        
        try {
            Long users = jdbcTemplate.queryForObject("SELECT COUNT(*) FROM users", Long.class);
            Long units = jdbcTemplate.queryForObject("SELECT COUNT(*) FROM military_units", Long.class);
            Long alerts = jdbcTemplate.queryForObject("SELECT COUNT(*) FROM alerts", Long.class);
            Long osint = jdbcTemplate.queryForObject("SELECT COUNT(*) FROM osint_events", Long.class);
            Long fire = jdbcTemplate.queryForObject("SELECT COUNT(*) FROM fire_missions", Long.class);

            stats.setTotalUsers(users != null ? users : 0);
            stats.setTotalUnits(units != null ? units : 0);
            stats.setTotalAlerts(alerts != null ? alerts : 0);
            stats.setTotalOsintEvents(osint != null ? osint : 0);
            stats.setTotalFireMissions(fire != null ? fire : 0);
        } catch (Exception e) {
            logger.error("Error fetching database stats: {}", e.getMessage());
        }

        return ResponseEntity.ok(stats);
    }

    private static final java.util.Set<String> ALLOWED_TABLES = java.util.Set.of(
            "military_units", "alerts", "osint_events", "fire_missions", "coa_plans",
            "operations_orders", "artillery_pieces", "forward_observers", "operational_graphics",
            "after_action_reports", "q5_reports", "logistics_requests", "soldiers",
            "specialty_catalog", "uavs", "unit_history_events", "admin_audit_logs",
            "users", "app_configuration"
    );

    @GetMapping("/table/{tableName}")
    public ResponseEntity<?> getTableData(@PathVariable String tableName) {
        String normalizedTable = tableName.toLowerCase().trim();
        // Validate table name to prevent SQL injection and enforce allowlist
        if (!normalizedTable.matches("^[a-zA-Z0-9_]+$") || !ALLOWED_TABLES.contains(normalizedTable)) {
            return ResponseEntity.badRequest().body("Table not found or not permitted for inspection.");
        }
        
        try {
            List<Map<String, Object>> data = jdbcTemplate.queryForList("SELECT * FROM " + normalizedTable + " LIMIT 1000");
            
            // Convert everything to string and redact sensitive fields
            List<Map<String, String>> safeData = new java.util.ArrayList<>();
            java.util.Set<String> sensitiveColumns = java.util.Set.of(
                "password", "hashed_password", "hashedpassword", "two_factor_secret", 
                "twofactorsecret", "token", "secret", "jwt_secret", "api_key", "apikey",
                "private_key", "key"
            );

            for (Map<String, Object> row : data) {
                Map<String, String> stringRow = new java.util.HashMap<>();
                boolean isSensitiveConfigKey = false;
                Object configKeyVal = row.get("config_key");
                if (configKeyVal == null) configKeyVal = row.get("configKey");
                if (configKeyVal != null) {
                    String ck = configKeyVal.toString().toUpperCase();
                    if (ck.contains("KEY") || ck.contains("TOKEN") || ck.contains("SECRET") || ck.contains("PASS") || ck.contains("CREDENTIAL")) {
                        isSensitiveConfigKey = true;
                    }
                }

                for (Map.Entry<String, Object> entry : row.entrySet()) {
                    String colKey = entry.getKey().toLowerCase();
                    if (sensitiveColumns.contains(colKey)) {
                        stringRow.put(entry.getKey(), "***REDACTED***");
                    } else if (isSensitiveConfigKey && (colKey.equals("config_value") || colKey.equals("configvalue"))) {
                        stringRow.put(entry.getKey(), "***REDACTED***");
                    } else {
                        stringRow.put(entry.getKey(), entry.getValue() == null ? "NULL" : entry.getValue().toString());
                    }
                }
                safeData.add(stringRow);
            }
            
            return ResponseEntity.ok(safeData);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body("Error fetching data: " + e.getMessage());
        }
    }

    @GetMapping("/audit-logs")
    public ResponseEntity<List<AdminAuditLog>> getAuditLogs() {
        return ResponseEntity.ok(auditLogRepository.findAll());
    }

    @PostMapping("/table/{tableName}/truncate")
    public ResponseEntity<String> truncateTable(
            @PathVariable String tableName,
            @RequestBody AdminTableActionRequest request,
            Authentication authentication) {

        String normalizedTable = tableName.toLowerCase().trim();
        if (!normalizedTable.matches("^[a-zA-Z0-9_]+$")) {
            return ResponseEntity.badRequest().body("Invalid table name");
        }

        // F01 / F08: Strictly block truncation of the users table
        if ("users".equals(normalizedTable)) {
            return ResponseEntity.status(403).body("Truncation of the users table is strictly forbidden.");
        }

        if (!ALLOWED_TABLES.contains(normalizedTable)) {
            return ResponseEntity.badRequest().body("Table not permitted for truncation.");
        }

        User admin = userRepository.findByUsername(authentication.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));

        if (!admin.getTwoFactorEnabled()) {
            return ResponseEntity.status(403).body("2FA must be enabled to perform destructive actions.");
        }

        if (request.getTotpCode() == null || request.getTotpCode().trim().isEmpty()) {
            return ResponseEntity.status(403).body("2FA code required.");
        }

        boolean isValid = twoFactorService.isOtpValid(admin.getTwoFactorSecret(), request.getTotpCode());
        if (!isValid) {
            return ResponseEntity.status(403).body("Invalid 2FA code.");
        }

        try {
            jdbcTemplate.execute("SET FOREIGN_KEY_CHECKS = 0;");
            jdbcTemplate.execute("TRUNCATE TABLE " + normalizedTable + ";");
            jdbcTemplate.execute("SET FOREIGN_KEY_CHECKS = 1;");

            AdminAuditLog log = new AdminAuditLog(
                    System.currentTimeMillis(),
                    admin.getUsername(),
                    "TRUNCATE_TABLE",
                    normalizedTable,
                    "Table truncated via Admin Panel by " + admin.getUsername()
            );
            auditLogRepository.save(log);

            return ResponseEntity.ok("Table " + normalizedTable + " has been truncated successfully.");
        } catch (Exception e) {
            logger.error("Failed to truncate table {}: {}", normalizedTable, e.getMessage());
            return ResponseEntity.internalServerError().body("Failed to truncate table: " + e.getMessage());
        }
    }
}
