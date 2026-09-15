package com.simcop;

import com.fasterxml.jackson.databind.ObjectMapper;
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
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Adversarial Stress & Bypass Test Suite for Milestone 1 (ACD).
 * Written by Challenger M1 to empirically stress-test:
 * - Honey-user variations (casing, whitespace, trimming)
 * - Canary endpoint normalization and bypass attempts
 * - Obfuscated RASP payloads (comments, encoding, case mixing)
 * - False positive resistance on benign military/business data
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
public class ActiveCyberDefenseAdversarialStressTests {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private LoginRateLimiterService rateLimiterService;

    @Autowired
    private AdminAuditLogRepository auditLogRepository;

    @Autowired
    private ObjectMapper objectMapper;

    private static final String IP_HONEY_1 = "198.51.200.1";
    private static final String IP_HONEY_2 = "198.51.200.2";
    private static final String IP_HONEY_3 = "198.51.200.3";
    private static final String IP_CANARY_1 = "198.51.200.11";
    private static final String IP_CANARY_2 = "198.51.200.12";
    private static final String IP_CANARY_3 = "198.51.200.13";
    private static final String IP_CANARY_4 = "198.51.200.14";
    private static final String IP_RASP_1 = "198.51.200.21";
    private static final String IP_RASP_2 = "198.51.200.22";
    private static final String IP_RASP_3 = "198.51.200.23";
    private static final String IP_RASP_4 = "198.51.200.24";
    private static final String IP_BENIGN_1 = "198.51.200.31";

    @BeforeEach
    @AfterEach
    void cleanup() {
        rateLimiterService.unblacklistIp(IP_HONEY_1);
        rateLimiterService.unblacklistIp(IP_HONEY_2);
        rateLimiterService.unblacklistIp(IP_HONEY_3);
        rateLimiterService.unblacklistIp(IP_CANARY_1);
        rateLimiterService.unblacklistIp(IP_CANARY_2);
        rateLimiterService.unblacklistIp(IP_CANARY_3);
        rateLimiterService.unblacklistIp(IP_CANARY_4);
        rateLimiterService.unblacklistIp(IP_RASP_1);
        rateLimiterService.unblacklistIp(IP_RASP_2);
        rateLimiterService.unblacklistIp(IP_RASP_3);
        rateLimiterService.unblacklistIp(IP_RASP_4);
        rateLimiterService.unblacklistIp(IP_BENIGN_1);
    }

    // =========================================================================
    // 1. Honey-Users: Case Variations, Padding & Trimming
    // =========================================================================

    @Test
    @DisplayName("Adversarial: Honey-user variations ('Root', 'C4ISR_ADMIN', 'root ') must trigger trap")
    void testHoneyUserVariations() throws Exception {
        // Test case variation 'Root'
        User u1 = new User();
        u1.setUsername("Root");
        u1.setHashedPassword("attackPass123");

        mockMvc.perform(post("/api/users/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(u1))
                        .with(req -> { req.setRemoteAddr(IP_HONEY_1); return req; }))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.error").value("Credenciales inválidas"));

        assertTrue(rateLimiterService.isIpBlacklisted(IP_HONEY_1), "IP with 'Root' must be blacklisted");

        // Subsequent call must be 403 Forbidden
        mockMvc.perform(get("/api/health")
                        .with(req -> { req.setRemoteAddr(IP_HONEY_1); return req; }))
                .andExpect(status().isForbidden());

        // Test uppercase 'C4ISR_ADMIN'
        User u2 = new User();
        u2.setUsername("C4ISR_ADMIN");
        u2.setHashedPassword("attackPass123");

        mockMvc.perform(post("/api/users/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(u2))
                        .with(req -> { req.setRemoteAddr(IP_HONEY_2); return req; }))
                .andExpect(status().isUnauthorized());

        assertTrue(rateLimiterService.isIpBlacklisted(IP_HONEY_2), "IP with 'C4ISR_ADMIN' must be blacklisted");

        // Test trailing whitespace 'root '
        User u3 = new User();
        u3.setUsername("root ");
        u3.setHashedPassword("attackPass123");

        mockMvc.perform(post("/api/users/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(u3))
                        .with(req -> { req.setRemoteAddr(IP_HONEY_3); return req; }))
                .andExpect(status().isUnauthorized());

        assertTrue(rateLimiterService.isIpBlacklisted(IP_HONEY_3), "IP with 'root ' must be blacklisted");
    }

    // =========================================================================
    // 2. Canary Endpoints: URI Normalization & Obfuscation Attempts
    // =========================================================================

    @Test
    @DisplayName("Adversarial: Canary endpoint variations ('/admin.php/', '/.env?secret=1', uppercase) must isolate IP")
    void testCanaryUriNormalization() throws Exception {
        // Trailing slash /admin.php/
        mockMvc.perform(get("/admin.php/")
                        .with(req -> { req.setRemoteAddr(IP_CANARY_1); return req; }))
                .andExpect(status().isNotFound());
        assertTrue(rateLimiterService.isIpBlacklisted(IP_CANARY_1), "/admin.php/ must isolate IP");

        // Query string /.env?secret=1
        mockMvc.perform(get("/.env?secret=1")
                        .with(req -> { req.setRemoteAddr(IP_CANARY_2); return req; }))
                .andExpect(status().isNotFound());
        assertTrue(rateLimiterService.isIpBlacklisted(IP_CANARY_2), "/.env?secret=1 must isolate IP");

        // Uppercase /ADMIN.PHP
        mockMvc.perform(get("/ADMIN.PHP")
                        .with(req -> { req.setRemoteAddr(IP_CANARY_3); return req; }))
                .andExpect(status().isNotFound());
        assertTrue(rateLimiterService.isIpBlacklisted(IP_CANARY_3), "/ADMIN.PHP must isolate IP");

        // Nested subpath /wp-login.php/subpath
        mockMvc.perform(get("/wp-login.php/subpath")
                        .with(req -> { req.setRemoteAddr(IP_CANARY_4); return req; }))
                .andExpect(status().isNotFound());
        assertTrue(rateLimiterService.isIpBlacklisted(IP_CANARY_4), "/wp-login.php/subpath must isolate IP");
    }

    // =========================================================================
    // 3. RASP Obfuscation: Mixed Case, URL Encoding & Obfuscated Payloads
    // =========================================================================

    @Test
    @DisplayName("Adversarial: Mixed case scanner user agent ('sQlMaP/2.0') must be intercepted")
    void testMixedCaseScannerUserAgent() throws Exception {
        mockMvc.perform(get("/api/health")
                        .header("User-Agent", "Mozilla/5.0 sQlMaP/2.0-dev")
                        .with(req -> { req.setRemoteAddr(IP_RASP_1); return req; }))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400));

        assertTrue(rateLimiterService.isIpBlacklisted(IP_RASP_1), "Mixed case scanner agent must be blacklisted");
    }

    @Test
    @DisplayName("Adversarial: URL-encoded SQLi payload in query string")
    void testUrlEncodedSqliInQuery() throws Exception {
        // Use URI.create to prevent MockMvc from double-encoding '%'
        java.net.URI uri = java.net.URI.create("/api/health?q=%27%20OR%20%271%27%3D%271");
        
        mockMvc.perform(get(uri)
                        .with(req -> {
                            req.setRemoteAddr(IP_RASP_2);
                            return req;
                        }))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400));

        assertTrue(rateLimiterService.isIpBlacklisted(IP_RASP_2), "URL-encoded SQLi must be blacklisted");
    }

    @Test
    @DisplayName("Adversarial: Obfuscated path traversal ('/api/..//etc/passwd' & '%2e%2e') must be intercepted")
    void testPathTraversalVariations() throws Exception {
        mockMvc.perform(get("/api/health?path=/api/..//etc/passwd")
                        .with(req -> { req.setRemoteAddr(IP_RASP_3); return req; }))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400));

        assertTrue(rateLimiterService.isIpBlacklisted(IP_RASP_3), "Path traversal /api/..//etc/passwd must be isolated");

        // Pass URL-encoded traversal via URI.create
        java.net.URI encodedUri = java.net.URI.create("/api/health?doc=%2e%2e%2f%2e%2e%2fetc/passwd");
        mockMvc.perform(get(encodedUri)
                        .with(req -> { req.setRemoteAddr(IP_RASP_4); return req; }))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400));

        assertTrue(rateLimiterService.isIpBlacklisted(IP_RASP_4), "Percent-encoded path traversal must be isolated");
    }

    // =========================================================================
    // 4. Precision & False-Positive Stress Testing on Benign Payloads
    // =========================================================================

    @Test
    @DisplayName("Precision: Legitimate business payloads with 'select', 'union', 'cat', 'drop' must NOT trigger false positives")
    void testBenignPayloadsNotBlocked() throws Exception {
        // Use POST /api/users/login which accepts POST with JSON body.
        // If RaspFilter blocks, it returns 400 Bad Request with "Invalid request payload detected"
        // If RaspFilter allows it, UserController handles it (e.g. returns 401 Credenciales inválidas because credentials don't match)

        // 1. Payload with 'select' alone in normal sentence
        User u1 = new User();
        u1.setUsername("normal_user");
        u1.setHashedPassword("Please select the appropriate combat unit from list");
        mockMvc.perform(post("/api/users/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(u1))
                        .with(req -> { req.setRemoteAddr(IP_BENIGN_1); return req; }))
                .andExpect(status().isUnauthorized()); // 401 from UserController, NOT 400 from RaspFilter!
        assertFalse(rateLimiterService.isIpBlacklisted(IP_BENIGN_1), "Benign 'select' must not be blacklisted");

        // 2. Payload with 'union' alone in legitimate diplomatic text
        User u2 = new User();
        u2.setUsername("normal_user");
        u2.setHashedPassword("European Union peace mission in sector");
        mockMvc.perform(post("/api/users/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(u2))
                        .with(req -> { req.setRemoteAddr(IP_BENIGN_1); return req; }))
                .andExpect(status().isUnauthorized());
        assertFalse(rateLimiterService.isIpBlacklisted(IP_BENIGN_1), "Benign 'union' must not be blacklisted");

        // 3. Payload with 'category' (contains 'cat')
        User u3 = new User();
        u3.setUsername("normal_user");
        u3.setHashedPassword("Logistics Category V Supply");
        mockMvc.perform(post("/api/users/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(u3))
                        .with(req -> { req.setRemoteAddr(IP_BENIGN_1); return req; }))
                .andExpect(status().isUnauthorized());
        assertFalse(rateLimiterService.isIpBlacklisted(IP_BENIGN_1), "Benign 'category' must not be blacklisted");

        // 4. Payload with 'drop' alone (tactical drop zone)
        User u4 = new User();
        u4.setUsername("normal_user");
        u4.setHashedPassword("Drop Zone Bravo elevation 2450");
        mockMvc.perform(post("/api/users/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(u4))
                        .with(req -> { req.setRemoteAddr(IP_BENIGN_1); return req; }))
                .andExpect(status().isUnauthorized());
        assertFalse(rateLimiterService.isIpBlacklisted(IP_BENIGN_1), "Benign 'drop zone' must not be blacklisted");

        // 5. Sentence having both 'union' and 'select' with natural phrasing: "union agreed to select"
        User u5 = new User();
        u5.setUsername("normal_user");
        u5.setHashedPassword("The trade union representatives met to select the agenda");
        mockMvc.perform(post("/api/users/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(u5))
                        .with(req -> { req.setRemoteAddr(IP_BENIGN_1); return req; }))
                .andExpect(status().isUnauthorized());
        assertFalse(rateLimiterService.isIpBlacklisted(IP_BENIGN_1), "Separated 'union ... select' must not be blacklisted");
    }

    // =========================================================================
    // 5. Stress Testing Edge Cases & Known Vulnerabilities (Challenger Probe)
    // =========================================================================

    @Test
    @DisplayName("Hardened: SQL comment obfuscation 'UNION/**/SELECT' is intercepted and isolates IP")
    void testSqlCommentObfuscationBypass() throws Exception {
        // Send UNION/**/SELECT in raw JSON password payload
        String attackPayload = "{\"username\": \"attacker\", \"password\": \"UNION/**/SELECT 1, 2, 3\"}";

        mockMvc.perform(post("/api/users/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(attackPayload)
                        .with(req -> { req.setRemoteAddr(IP_RASP_1); return req; }))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400));

        // Empirically verify that IP was blacklisted
        assertTrue(rateLimiterService.isIpBlacklisted(IP_RASP_1),
                "UNION/**/SELECT must be intercepted by RaspFilter and blacklist IP for 24h");
    }

    @Test
    @DisplayName("Hardened: Benign payload with '&&' passes RASP and does NOT trigger false positive")
    void testDoubleAmpersandFalsePositive() throws Exception {
        String dedicatedIp = "198.51.200.77";
        try {
            // Raw JSON string with '&&' in password field (benign tactical text)
            String payloadWithAmpersands = "{\"username\": \"tactical_officer\", \"password\": \"Units Alpha && Bravo\"}";

            MvcResult result = mockMvc.perform(post("/api/users/login")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(payloadWithAmpersands)
                            .with(req -> { req.setRemoteAddr(dedicatedIp); return req; }))
                    .andReturn();

            int status = result.getResponse().getStatus();
            boolean blacklisted = rateLimiterService.isIpBlacklisted(dedicatedIp);
            System.out.println("DEBUG HARDENED: Payload with '&&' returned status = " + status + ", blacklisted = " + blacklisted);

            // Benign payload must pass RASP and reach UserController (401 Unauthorized for non-existent user)
            assertEquals(401, status, "Benign payload with '&&' must pass RASP and return 401 Unauthorized from controller");
            assertFalse(blacklisted, "IP must NOT be blacklisted for benign '&&' in legitimate text");

            // Verify that genuine command injection with '&&' IS intercepted
            String maliciousPayload = "{\"username\": \"attacker\", \"password\": \"test && cat /etc/passwd\"}";
            mockMvc.perform(post("/api/users/login")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(maliciousPayload)
                            .with(req -> { req.setRemoteAddr(dedicatedIp); return req; }))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.status").value(400));
            assertTrue(rateLimiterService.isIpBlacklisted(dedicatedIp),
                    "Malicious payload with '&& cat' must be intercepted and blacklist IP");
        } finally {
            rateLimiterService.unblacklistIp(dedicatedIp);
        }
    }

    @Test
    @DisplayName("Hardened: Canary endpoint with double slash '//admin.php' is trapped and isolates IP")
    void testDoubleSlashCanaryBypass() throws Exception {
        mockMvc.perform(get("//admin.php")
                        .with(req -> { req.setRemoteAddr(IP_CANARY_1); return req; }))
                .andExpect(status().isNotFound());

        boolean blacklisted = rateLimiterService.isIpBlacklisted(IP_CANARY_1);
        System.out.println("DEBUG HARDENED CANARY: //admin.php blacklisted = " + blacklisted);
        assertTrue(blacklisted, "//admin.php must be collapsed and trigger canary blacklist");
    }

    @Test
    @DisplayName("Probe: Double encoded /%2e%65%6e%76 canary endpoint")
    void testEncodedCanaryProbe() throws Exception {
        MvcResult result = mockMvc.perform(get("/%2e%65%6e%76")
                        .with(req -> { req.setRemoteAddr(IP_CANARY_1); return req; }))
                .andReturn();

        int status = result.getResponse().getStatus();
        boolean blacklisted = rateLimiterService.isIpBlacklisted(IP_CANARY_1);
        System.out.println("DEBUG PROBE: /%2e%65%6e%76 returned status = " + status + ", blacklisted = " + blacklisted);
    }
}
