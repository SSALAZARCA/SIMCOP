package com.simcop.controller;

import com.simcop.dto.AdminTableActionRequest;
import com.simcop.dto.DatabaseStatsDTO;
import com.simcop.model.AdminAuditLog;
import com.simcop.repository.AdminAuditLogRepository;
import com.simcop.service.TwoFactorService;
import com.simcop.model.User;
import com.simcop.repository.UserRepository;
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
            e.printStackTrace();
        }

        return ResponseEntity.ok(stats);
    }

    @GetMapping("/table/{tableName}")
    public ResponseEntity<?> getTableData(@PathVariable String tableName) {
        // Validate table name to prevent SQL injection
        if (!tableName.matches("^[a-zA-Z0-9_]+$")) {
            return ResponseEntity.badRequest().body("Invalid table name");
        }
        
        try {
            List<Map<String, Object>> data = jdbcTemplate.queryForList("SELECT * FROM " + tableName + " LIMIT 1000");
            
            // Convert everything to string to prevent Jackson serialization errors (e.g., with binary or date types)
            List<Map<String, String>> safeData = new java.util.ArrayList<>();
            for (Map<String, Object> row : data) {
                Map<String, String> stringRow = new java.util.HashMap<>();
                for (Map.Entry<String, Object> entry : row.entrySet()) {
                    stringRow.put(entry.getKey(), entry.getValue() == null ? "NULL" : entry.getValue().toString());
                }
                safeData.add(stringRow);
            }
            
            return ResponseEntity.ok(safeData);
        } catch (Exception e) {
            e.printStackTrace();
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

        if (!tableName.matches("^[a-zA-Z0-9_]+$")) {
            return ResponseEntity.badRequest().body("Invalid table name");
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
            jdbcTemplate.execute("TRUNCATE TABLE " + tableName + ";");
            jdbcTemplate.execute("SET FOREIGN_KEY_CHECKS = 1;");

            AdminAuditLog log = new AdminAuditLog(
                    System.currentTimeMillis(),
                    admin.getUsername(),
                    "TRUNCATE_TABLE",
                    tableName,
                    "Table truncated via Admin Panel by " + admin.getUsername()
            );
            auditLogRepository.save(log);

            return ResponseEntity.ok("Table " + tableName + " has been truncated successfully.");
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.internalServerError().body("Failed to truncate table: " + e.getMessage());
        }
    }
}
