package com.simcop;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.simcop.config.CachedBodyHttpServletRequest;
import com.simcop.model.AdminAuditLog;
import com.simcop.model.User;
import com.simcop.repository.AdminAuditLogRepository;
import com.simcop.security.DeceptionCatalog;
import com.simcop.service.LoginRateLimiterService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.io.BufferedReader;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;

import static org.hamcrest.Matchers.containsString;
import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Test suite for Milestone 1: Core Tactical Deception & RASP Filter Chain.
 * Covers:
 * - DeceptionCatalog (Honey-users and Canary routes)
 * - LoginRateLimiterService 24-hour IP Blacklist & Audit Logging
 * - IpBlacklistFilter (403 Forbidden access denial for isolated IPs)
 * - CanaryEndpointFilter (404 Not Found & instant 24h IP isolation)
 * - CachedBodyHttpServletRequest (Reusable stream reading without exhaustion)
 * - RaspFilter (SQLi, Path Traversal, Command Injection, Scanner User-Agents)
 * - UserController Honey-User Trap (Instant IP isolation on honey-user login)
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
public class ActiveCyberDefenseM1Tests {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private LoginRateLimiterService rateLimiterService;

    @Autowired
    private AdminAuditLogRepository auditLogRepository;

    @Autowired
    private ObjectMapper objectMapper;

    private static final String ATTACKER_IP_1 = "198.51.100.10";
    private static final String ATTACKER_IP_2 = "198.51.100.20";
    private static final String ATTACKER_IP_3 = "198.51.100.30";
    private static final String ATTACKER_IP_4 = "198.51.100.40";
    private static final String ATTACKER_IP_5 = "198.51.100.50";
    private static final String CLEAN_IP = "198.51.100.99";

    @BeforeEach
    @AfterEach
    void cleanUpIsolation() {
        rateLimiterService.unblacklistIp(ATTACKER_IP_1);
        rateLimiterService.unblacklistIp(ATTACKER_IP_2);
        rateLimiterService.unblacklistIp(ATTACKER_IP_3);
        rateLimiterService.unblacklistIp(ATTACKER_IP_4);
        rateLimiterService.unblacklistIp(ATTACKER_IP_5);
        rateLimiterService.unblacklistIp(CLEAN_IP);
    }

    // =========================================================================
    // 1. DeceptionCatalog Unit Verification
    // =========================================================================

    @Test
    @DisplayName("DeceptionCatalog correctly recognizes all 5 honey-users (case-insensitive)")
    void testHoneyUsersCatalog() {
        assertTrue(DeceptionCatalog.isHoneyUser("c4isr_admin"));
        assertTrue(DeceptionCatalog.isHoneyUser("C4ISR_ADMIN"));
        assertTrue(DeceptionCatalog.isHoneyUser("general.rodriguez"));
        assertTrue(DeceptionCatalog.isHoneyUser("ROOT"));
        assertTrue(DeceptionCatalog.isHoneyUser("backup_admin"));
        assertTrue(DeceptionCatalog.isHoneyUser("superadmin_test"));

        assertFalse(DeceptionCatalog.isHoneyUser("santiago.salazar"));
        assertFalse(DeceptionCatalog.isHoneyUser("admin"));
        assertFalse(DeceptionCatalog.isHoneyUser("regular_user"));
        assertFalse(DeceptionCatalog.isHoneyUser(null));
        assertFalse(DeceptionCatalog.isHoneyUser("   "));
    }

    @Test
    @DisplayName("DeceptionCatalog correctly recognizes all 5 canary endpoints (with variations)")
    void testCanaryEndpointsCatalog() {
        assertTrue(DeceptionCatalog.isCanaryEndpoint("/.env"));
        assertTrue(DeceptionCatalog.isCanaryEndpoint("/.env?key=val"));
        assertTrue(DeceptionCatalog.isCanaryEndpoint("/admin.php"));
        assertTrue(DeceptionCatalog.isCanaryEndpoint("/api/debug/dump"));
        assertTrue(DeceptionCatalog.isCanaryEndpoint("/actuator/env"));
        assertTrue(DeceptionCatalog.isCanaryEndpoint("/wp-login.php"));
        assertTrue(DeceptionCatalog.isCanaryEndpoint("/wp-login.php/"));

        assertFalse(DeceptionCatalog.isCanaryEndpoint("/api/users/login"));
        assertFalse(DeceptionCatalog.isCanaryEndpoint("/api/health"));
        assertFalse(DeceptionCatalog.isCanaryEndpoint("/api/weather"));
        assertFalse(DeceptionCatalog.isCanaryEndpoint(null));
        assertFalse(DeceptionCatalog.isCanaryEndpoint(""));
    }

    // =========================================================================
    // 2. LoginRateLimiterService 24-hour Blacklist Verification
    // =========================================================================

    @Test
    @DisplayName("LoginRateLimiterService blacklists IP for 24 hours, persists audit log, and unblacklists correctly")
    void testBlacklistLifecycleAndAudit() {
        String testIp = ATTACKER_IP_1;
        assertFalse(rateLimiterService.isIpBlacklisted(testIp));

        rateLimiterService.blacklistIp(testIp, 24 * 3600 * 1000L, "TEST_MANUAL_ISOLATION");

        assertTrue(rateLimiterService.isIpBlacklisted(testIp));
        assertTrue(rateLimiterService.isBlocked(testIp, "anyUser"));
        assertTrue(rateLimiterService.getBlacklistedIps().containsKey(testIp));
        assertTrue(rateLimiterService.getRemainingLockoutSeconds(testIp) > 86000);

        // Verify audit log
        List<AdminAuditLog> logs = auditLogRepository.findAll();
        boolean foundAudit = logs.stream().anyMatch(log ->
                "TACTICAL_DECEPTION_RASP".equals(log.getUsername()) &&
                        "IP_ISOLATED_BLACKLIST".equals(log.getAction()) &&
                        testIp.equals(log.getTarget())
        );
        assertTrue(foundAudit, "Blacklisting must persist an AdminAuditLog record");

        // Unblacklist
        rateLimiterService.unblacklistIp(testIp);
        assertFalse(rateLimiterService.isIpBlacklisted(testIp));
    }

    // =========================================================================
    // 3. IpBlacklistFilter Integration Verification
    // =========================================================================

    @Test
    @DisplayName("IpBlacklistFilter immediately returns HTTP 403 Access Denied for blacklisted IP")
    void testBlacklistedIpBlockedByFilter() throws Exception {
        rateLimiterService.blacklistIp(ATTACKER_IP_2, 24 * 3600 * 1000L, "SIMULATED_ATTACK_ISOLATION");

        mockMvc.perform(get("/api/health")
                        .with(request -> {
                            request.setRemoteAddr(ATTACKER_IP_2);
                            return request;
                        }))
                .andExpect(status().isForbidden())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.error").value("Access Denied"))
                .andExpect(jsonPath("$.message").value("IP address has been isolated due to security policy violations"));
    }

    // =========================================================================
    // 4. CanaryEndpointFilter Integration Verification
    // =========================================================================

    @Test
    @DisplayName("CanaryEndpointFilter returns HTTP 404 and isolates scanner IP on accessing canary route")
    void testCanaryEndpointTriggering() throws Exception {
        assertFalse(rateLimiterService.isIpBlacklisted(ATTACKER_IP_3));

        mockMvc.perform(get("/.env")
                        .with(request -> {
                            request.setRemoteAddr(ATTACKER_IP_3);
                            return request;
                        }))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.error").value("Not Found"));

        // Attacker IP must now be isolated in 24h blacklist
        assertTrue(rateLimiterService.isIpBlacklisted(ATTACKER_IP_3),
                "Scanner accessing /.env must be blacklisted for 24h");

        // Subsequent requests from this IP must be blocked by IpBlacklistFilter with 403
        mockMvc.perform(get("/api/health")
                        .with(request -> {
                            request.setRemoteAddr(ATTACKER_IP_3);
                            return request;
                        }))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.error").value("Access Denied"));
    }

    // =========================================================================
    // 5. CachedBodyHttpServletRequest Unit Verification
    // =========================================================================

    @Test
    @DisplayName("CachedBodyHttpServletRequest allows multiple reads of input stream and reader without exhaustion")
    void testCachedBodyMultipleReads() throws Exception {
        byte[] payload = "{\"command\": \"tactical_recon\", \"target\": \"sector_4\"}".getBytes(StandardCharsets.UTF_8);

        MockHttpServletRequest rawRequest = new MockHttpServletRequest();
        rawRequest.setContent(payload);
        rawRequest.setCharacterEncoding("UTF-8");

        CachedBodyHttpServletRequest wrapper = new CachedBodyHttpServletRequest(rawRequest);

        // First read via getInputStream()
        InputStream is1 = wrapper.getInputStream();
        byte[] read1 = is1.readAllBytes();
        assertArrayEquals(payload, read1);

        // Second read via getInputStream()
        InputStream is2 = wrapper.getInputStream();
        byte[] read2 = is2.readAllBytes();
        assertArrayEquals(payload, read2);

        // Third read via getReader()
        BufferedReader reader = wrapper.getReader();
        String readerText = reader.readLine();
        assertEquals(new String(payload, StandardCharsets.UTF_8), readerText);
    }

    // =========================================================================
    // 6. RaspFilter Payload Neutralization & Tarpit Verification
    // =========================================================================

    @Test
    @DisplayName("RaspFilter intercepts SQL Injection payload in body, isolates IP, and returns HTTP 400")
    void testRaspSqlInjectionInBody() throws Exception {
        String sqliBody = "{\"username\": \"admin' OR '1'='1\", \"password\": \"test\"}";

        mockMvc.perform(post("/api/users/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(sqliBody)
                        .with(request -> {
                            request.setRemoteAddr(ATTACKER_IP_4);
                            return request;
                        }))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.error").value("Bad Request"))
                .andExpect(jsonPath("$.message").value("Invalid request payload detected"));

        assertTrue(rateLimiterService.isIpBlacklisted(ATTACKER_IP_4),
                "Offending SQLi IP must be isolated for 24 hours");
    }

    @Test
    @DisplayName("RaspFilter intercepts Path Traversal in Query String, isolates IP, and returns HTTP 400")
    void testRaspPathTraversalInQuery() throws Exception {
        mockMvc.perform(get("/api/health?file=../../etc/passwd")
                        .with(request -> {
                            request.setRemoteAddr(ATTACKER_IP_5);
                            return request;
                        }))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.error").value("Bad Request"))
                .andExpect(jsonPath("$.message").value("Invalid request payload detected"));

        assertTrue(rateLimiterService.isIpBlacklisted(ATTACKER_IP_5),
                "Offending Path Traversal IP must be isolated for 24 hours");
    }

    @Test
    @DisplayName("RaspFilter intercepts Command Injection payload in body, isolates IP, and returns HTTP 400")
    void testRaspCommandInjectionInBody() throws Exception {
        String cmdInjection = "{\"target\": \"router-1; cat /etc/passwd\"}";

        mockMvc.perform(post("/api/users/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(cmdInjection)
                        .with(request -> {
                            request.setRemoteAddr(ATTACKER_IP_5);
                            return request;
                        }))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.error").value("Bad Request"))
                .andExpect(jsonPath("$.message").value("Invalid request payload detected"));

        assertTrue(rateLimiterService.isIpBlacklisted(ATTACKER_IP_5),
                "Offending Command Injection IP must be isolated for 24 hours");
    }

    @Test
    @DisplayName("RaspFilter intercepts automated scanner User-Agent (sqlmap) and blocks with HTTP 400")
    void testRaspScannerUserAgent() throws Exception {
        String scannerIp = "198.51.100.60";
        try {
            mockMvc.perform(get("/api/health")
                            .header("User-Agent", "sqlmap/1.6.12#stable (https://sqlmap.org)")
                            .with(request -> {
                                request.setRemoteAddr(scannerIp);
                                return request;
                            }))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.status").value(400));

            assertTrue(rateLimiterService.isIpBlacklisted(scannerIp),
                    "sqlmap User-Agent scanner must be isolated for 24 hours");
        } finally {
            rateLimiterService.unblacklistIp(scannerIp);
        }
    }

    // =========================================================================
    // 7. UserController Honey-User Trap Verification
    // =========================================================================

    @Test
    @DisplayName("UserController honey-user login attempt returns HTTP 401 and immediately blacklists IP")
    void testHoneyUserLoginTrap() throws Exception {
        String honeyIp = "198.51.100.70";
        try {
            User honeyAttempt = new User();
            honeyAttempt.setUsername("root");
            honeyAttempt.setHashedPassword("toor123");

            mockMvc.perform(post("/api/users/login")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(honeyAttempt))
                            .with(request -> {
                                request.setRemoteAddr(honeyIp);
                                return request;
                            }))
                    .andExpect(status().isUnauthorized())
                    .andExpect(jsonPath("$.error").value("Credenciales inválidas"));

            // Attacker IP must be isolated immediately in 24h blacklist
            assertTrue(rateLimiterService.isIpBlacklisted(honeyIp),
                    "Honey-user authentication attempt must instantly blacklist client IP");

            // Forensic audit entry must exist
            List<AdminAuditLog> logs = auditLogRepository.findAll();
            boolean honeyAuditExists = logs.stream().anyMatch(log ->
                    "HONEY_USER_DECEPTION".equals(log.getUsername()) &&
                            "INTRUSION_ATTEMPT".equals(log.getAction()) &&
                            log.getDetails().contains("root")
            );
            assertTrue(honeyAuditExists, "Honey-user login attempt must generate HONEY_USER_DECEPTION audit entry");

            // Subsequent requests from honeyIp are rejected with HTTP 403 Forbidden
            mockMvc.perform(get("/api/health")
                            .with(request -> {
                                request.setRemoteAddr(honeyIp);
                                return request;
                            }))
                    .andExpect(status().isForbidden())
                    .andExpect(jsonPath("$.error").value("Access Denied"));
        } finally {
            rateLimiterService.unblacklistIp(honeyIp);
        }
    }
}
