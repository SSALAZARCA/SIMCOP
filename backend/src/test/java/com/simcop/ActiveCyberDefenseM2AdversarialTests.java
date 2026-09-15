package com.simcop;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.simcop.model.*;
import com.simcop.model.embeddable.GeoLocation;
import com.simcop.repository.AdminAuditLogRepository;
import com.simcop.repository.AlertRepository;
import com.simcop.repository.UserRepository;
import com.simcop.security.DlpThrottlingFilter;
import com.simcop.service.*;
import com.simcop.util.JwtUtil;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpStatus;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Adversarial Stress & Bypass Test Suite for Milestone 2 (Active Cyber Defense).
 * Executed by Challenger M2 to empirically stress-test:
 * 1. Impossible Travel:
 *    - Sub-millisecond (0ms) concurrent/instantaneous requests (division by zero resilience)
 *    - Out-of-order timestamps / clock drift resilience
 *    - Benign high-speed travel within realistic military aviation limits (false-positive prevention)
 *    - Cross-endpoint token revocation cascade and post-revocation isolation
 *    - Safe re-authentication with fresh tokens after revocation
 *    - Malformed and adversarial X-Forwarded-For headers (SQLi, path traversal, invalid octets)
 * 2. DLP Anti-Scraping Throttling:
 *    - Multi-resource rotating scraping bursts across all 9 sensitive tactical endpoints
 *    - Sliding window expiration and clean recovery for benign traffic
 *    - Exemption of non-sensitive endpoints from throttling
 * 3. Superadmin Alert Isolation:
 *    - Rigorous exclusion across all non-superadmin operational roles
 *    - Full forensic data payload integrity for Superadmin
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
public class ActiveCyberDefenseM2AdversarialTests {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private GeoIpService geoIpService;

    @Autowired
    private SessionTrackingService sessionTrackingService;

    @Autowired
    private ImpossibleTravelService impossibleTravelService;

    @Autowired
    private ActiveCyberDefenseService activeCyberDefenseService;

    @Autowired
    private DlpThrottlingFilter dlpThrottlingFilter;

    @Autowired
    private LoginRateLimiterService rateLimiterService;

    @Autowired
    private AlertRepository alertRepository;

    @Autowired
    private AdminAuditLogRepository auditLogRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private JwtUtil jwtUtil;

    @Autowired
    private ObjectMapper objectMapper;

    private static final String IP_BOGOTA = "190.25.1.1";
    private static final String IP_MOSCOW = "178.62.1.1";
    private static final String IP_WASHINGTON = "198.51.100.5";
    private static final String IP_FRANKFURT = "80.249.1.1";
    private static final String IP_ADVERSARY_SCRAPER = "198.51.100.222";

    @BeforeEach
    @AfterEach
    void cleanup() {
        sessionTrackingService.clear();
        dlpThrottlingFilter.clear();
        rateLimiterService.unblacklistIp(IP_BOGOTA);
        rateLimiterService.unblacklistIp(IP_MOSCOW);
        rateLimiterService.unblacklistIp(IP_WASHINGTON);
        rateLimiterService.unblacklistIp(IP_FRANKFURT);
        rateLimiterService.unblacklistIp(IP_ADVERSARY_SCRAPER);
        rateLimiterService.unblacklistIp("198.51.100.223");
    }

    // =========================================================================
    // 1. Impossible Travel: Concurrency, Clocks & Boundary Stress
    // =========================================================================

    @Test
    @DisplayName("Impossible Travel: Sub-millisecond (0ms) concurrent request triggers anomaly without division-by-zero")
    void testSubMillisecondZeroTimeDeltaConcurrency() {
        String username = "adversary_target_1";
        String token = jwtUtil.generateToken(username, "OFICIAL_OPERACIONES");
        long now = System.currentTimeMillis();

        // Previous session in Bogota recorded at time 'now'
        sessionTrackingService.recordUserSession(username, token, IP_BOGOTA, GeoIpService.BOGOTA_HQ, now);

        // Immediate concurrent request from Moscow at exact same millisecond (elapsed = 0ms)
        boolean anomaly = impossibleTravelService.checkTravelAnomaly(username, IP_MOSCOW, token);

        assertTrue(anomaly, "Instantaneous relocation (0ms) from Bogota to Moscow must trigger impossible travel");
        assertTrue(sessionTrackingService.isTokenRevoked(token, username), "Token must be revoked immediately");

        // Verify IP was isolated
        assertTrue(rateLimiterService.isBlocked(IP_MOSCOW, null), "Offending foreign IP must be isolated in rate limiter");
    }

    @Test
    @DisplayName("Impossible Travel: Clock skew / negative elapsed time handled safely without throwing")
    void testNegativeClockSkewTimestampResilience() {
        String username = "adversary_target_2";
        String token = jwtUtil.generateToken(username, "OFICIAL_OPERACIONES");

        // Set previous timestamp 1 hour in the FUTURE (simulating clock drift / skewed NTP)
        long futureTimestamp = System.currentTimeMillis() + 3600000L;
        sessionTrackingService.recordUserSession(username, token, IP_BOGOTA, GeoIpService.BOGOTA_HQ, futureTimestamp);

        // Request from Moscow: deltaHours will be negative, Math.max(negative, 0.001) will clamp to 0.001
        assertDoesNotThrow(() -> {
            boolean anomaly = impossibleTravelService.checkTravelAnomaly(username, IP_MOSCOW, token);
            assertTrue(anomaly, "Negative delta should be clamped safely and still detect impossible travel distance");
        });
    }

    @Test
    @DisplayName("Impossible Travel: Benign high-speed travel within tactical threshold is permitted")
    void testBenignHighSpeedTravelWithinTacticalLimits() {
        String username = "piloto.militar";
        String token = jwtUtil.generateToken(username, "OFICIAL_OPERACIONES");
        long now = System.currentTimeMillis();

        // 1. Normal ground/short hop: Bogota HQ
        sessionTrackingService.recordUserSession(username, token, IP_BOGOTA, GeoIpService.BOGOTA_HQ, now);

        // Same location request: distance 0km
        boolean sameLocAnomaly = impossibleTravelService.checkTravelAnomaly(username, "190.25.1.2", token);
        assertFalse(sameLocAnomaly, "Relocation within same subnet/city must NEVER trigger impossible travel");
        assertFalse(sessionTrackingService.isTokenRevoked(token, username), "Token must stay valid");

        // 2. Tactical aviation: 300km flight (e.g. Bogota to Cali)
        // Set previous session 300km away, 1 hour ago
        GeoLocation caliLoc = new GeoLocation(3.4516, -76.5320); // ~300km from Bogota
        sessionTrackingService.recordUserSession(username, token, "181.50.1.5", caliLoc, System.currentTimeMillis() - 3600000L);

        // Request back from Bogota (300km in 1h = 300 km/h) -> distance < 500km, speed < 1000km/h
        boolean aviationHopAnomaly = impossibleTravelService.checkTravelAnomaly(username, IP_BOGOTA, token);
        assertFalse(aviationHopAnomaly, "Flight hop under 500km must NOT trigger impossible travel false positive");
        assertFalse(sessionTrackingService.isTokenRevoked(token, username), "Token must remain valid for tactical aviation");
    }

    @Test
    @DisplayName("Impossible Travel: Token revocation cascade blocks subsequent calls on all endpoints")
    void testTokenRevocationCascadeAcrossEndpoints() throws Exception {
        String username = "mayor.ramirez";
        String token = jwtUtil.generateToken(username, "OFICIAL_OPERACIONES");

        // 1. User starts session at Bogota HQ
        sessionTrackingService.recordUserSession(username, token, IP_BOGOTA, GeoIpService.BOGOTA_HQ, System.currentTimeMillis());

        // 2. Malicious request arrives from Moscow (triggers impossible travel)
        mockMvc.perform(get("/api/soldiers")
                        .header("Authorization", "Bearer " + token)
                        .header("X-Forwarded-For", IP_MOSCOW))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.error").value("Impossible travel detected. Session revoked."));

        // 3. User attempts to call /api/soldiers again from original Bogota IP with same token
        // MUST be rejected with 401 Session revoked by JwtAuthenticationFilter
        mockMvc.perform(get("/api/soldiers")
                        .header("Authorization", "Bearer " + token)
                        .header("X-Forwarded-For", IP_BOGOTA))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.error").value("Session revoked due to anomalous security event"));

        // 4. Attacker attempts to call /api/units from Moscow with same token
        // MUST be rejected either with 403 Forbidden (IpBlacklistFilter) or 401 Unauthorized (JwtAuthenticationFilter)
        mockMvc.perform(get("/api/units")
                        .header("Authorization", "Bearer " + token)
                        .header("X-Forwarded-For", IP_MOSCOW))
                .andExpect(result -> {
                    int status = result.getResponse().getStatus();
                    assertTrue(status == 401 || status == 403, "Access must be completely denied (401 or 403)");
                });
    }

    @Test
    @DisplayName("Impossible Travel: Re-authentication after revocation issues fresh valid token")
    void testReAuthenticationAfterRevocationGetsFreshValidToken() throws Exception {
        String username = "capitan.reauth";
        String oldToken = jwtUtil.generateToken(username, "OFICIAL_OPERACIONES");

        // Revoke the user due to anomaly
        sessionTrackingService.recordUserSession(username, oldToken, IP_BOGOTA, GeoIpService.BOGOTA_HQ, System.currentTimeMillis());
        sessionTrackingService.revokeUser(username);
        assertTrue(sessionTrackingService.isTokenRevoked(oldToken, username));

        // Sleep 1100ms to cross the standard JWT 1-second NumericDate precision boundary
        Thread.sleep(1100);

        // Generate a new token issued after the cutoff
        String newToken = jwtUtil.generateToken(username, "OFICIAL_OPERACIONES");
        sessionTrackingService.recordUserSession(username, newToken, IP_BOGOTA, GeoIpService.BOGOTA_HQ, System.currentTimeMillis());

        // Fresh token is NOT revoked
        assertFalse(sessionTrackingService.isTokenRevoked(newToken, username), "Fresh token generated after cutoff must be valid");

        // Token check in SessionTrackingService passes
        assertFalse(sessionTrackingService.isTokenRevoked(newToken, username));
    }

    @Test
    @DisplayName("GeoIpService: Malformed, multi-IP, and adversarial IPs resolve safely without exceptions")
    void testMalformedAndAdversarialXForwardedForIps() {
        // Multi-IP chain (e.g. client, proxy1, proxy2)
        assertEquals(GeoIpService.MOSCOW_RU.getLat(), geoIpService.resolveIp("178.62.1.2, 10.0.0.1, 192.168.1.1").getLat(), 0.001);
        assertEquals(GeoIpService.WASHINGTON_US.getLat(), geoIpService.resolveIp("198.51.100.1, 181.50.1.1").getLat(), 0.001);

        // IP with port
        assertEquals(GeoIpService.MOSCOW_RU.getLat(), geoIpService.resolveIp("178.62.1.2:9090").getLat(), 0.001);

        // Adversarial inputs that should fall back gracefully to Bogota HQ without crashing
        assertEquals(GeoIpService.BOGOTA_HQ.getLat(), geoIpService.resolveIp("'; DROP TABLE users; --").getLat(), 0.001);
        assertEquals(GeoIpService.BOGOTA_HQ.getLat(), geoIpService.resolveIp("not-an-ip-address").getLat(), 0.001);
        assertEquals(GeoIpService.BOGOTA_HQ.getLat(), geoIpService.resolveIp("999.999.999.999").getLat(), 0.001);
        assertEquals(GeoIpService.BOGOTA_HQ.getLat(), geoIpService.resolveIp("...").getLat(), 0.001);
        assertEquals(GeoIpService.BOGOTA_HQ.getLat(), geoIpService.resolveIp("10.0.0.1.extra.part").getLat(), 0.001);
        assertEquals(GeoIpService.BOGOTA_HQ.getLat(), geoIpService.resolveIp(null).getLat(), 0.001);
        assertEquals(GeoIpService.BOGOTA_HQ.getLat(), geoIpService.resolveIp("   ").getLat(), 0.001);
    }

    // =========================================================================
    // 2. DLP Anti-Scraping Throttling & Sliding Window Stress
    // =========================================================================

    @Test
    @DisplayName("DLP Throttling: Rotating across all 9 tactical endpoints aggregates into single client window")
    void testCrossEndpointMultiResourceScrapingBurst() throws Exception {
        String testIp = IP_ADVERSARY_SCRAPER;
        String[] sensitiveEndpoints = {
                "/api/soldiers",
                "/api/units",
                "/api/graphics",
                "/api/observers",
                "/api/artillery",
                "/api/uav",
                "/api/ordop",
                "/api/coa-plans",
                "/api/intel"
        };

        // 1. Send 15 requests spread across different sensitive endpoints (Tier 1: <= 15 reqs)
        for (int i = 0; i < 15; i++) {
            String uri = sensitiveEndpoints[i % sensitiveEndpoints.length];
            MockHttpServletRequest req = new MockHttpServletRequest();
            req.setRequestURI(uri);
            req.setRemoteAddr(testIp);
            MockHttpServletResponse res = new MockHttpServletResponse();
            MockFilterChain chain = new MockFilterChain();

            dlpThrottlingFilter.doFilter(req, res, chain);
            assertEquals(HttpStatus.OK.value(), res.getStatus(), "Request " + (i + 1) + " on " + uri + " should pass normally");
        }

        // 2. Fast-forward requests 16-25 to simulate rapid scraping burst
        long now = System.currentTimeMillis();
        for (int i = 16; i <= 25; i++) {
            dlpThrottlingFilter.recordRequest(testIp, now);
        }

        // 3. Request 26 on /api/ordop breaches threshold -> HTTP 429 Too Many Requests
        MockHttpServletRequest req26 = new MockHttpServletRequest();
        req26.setRequestURI("/api/ordop");
        req26.setRemoteAddr(testIp);
        MockHttpServletResponse res26 = new MockHttpServletResponse();
        MockFilterChain chain26 = new MockFilterChain();

        dlpThrottlingFilter.doFilter(req26, res26, chain26);
        assertEquals(HttpStatus.TOO_MANY_REQUESTS.value(), res26.getStatus(), "Request 26 on /api/ordop must return HTTP 429");
        assertEquals("60", res26.getHeader("Retry-After"));
        assertTrue(res26.getContentAsString().contains("Massive automated scraping burst detected"));

        // 4. Request 27 on /api/intel also blocked with HTTP 429
        MockHttpServletRequest req27 = new MockHttpServletRequest();
        req27.setRequestURI("/api/intel");
        req27.setRemoteAddr(testIp);
        MockHttpServletResponse res27 = new MockHttpServletResponse();
        MockFilterChain chain27 = new MockFilterChain();

        dlpThrottlingFilter.doFilter(req27, res27, chain27);
        assertEquals(HttpStatus.TOO_MANY_REQUESTS.value(), res27.getStatus(), "Request 27 on /api/intel must return HTTP 429");

        // 5. Verify intrusion alert logged
        List<Alert> alerts = alertRepository.findAll();
        boolean foundBurstAlert = alerts.stream().anyMatch(a ->
                a.getType() == AlertType.CYBER_INTRUSION_DETECTED &&
                a.getData() != null && a.getData().contains("DLP_SCRAPING_BURST") &&
                a.getData().contains(testIp));
        assertTrue(foundBurstAlert, "DLP scraping burst alert must be recorded with attacker IP");
    }

    @Test
    @DisplayName("DLP Throttling: Sliding window expiration (11s) cleanly clears count and allows new requests")
    void testSlidingWindowExpirationAllowsSubsequentNormalTraffic() throws Exception {
        String testIp = "198.51.100.223";

        // Record 15 requests in the PAST (12 seconds ago)
        long pastTime = System.currentTimeMillis() - 12000L;
        for (int i = 0; i < 15; i++) {
            dlpThrottlingFilter.recordRequest(testIp, pastTime);
        }

        // New request now: should evict the 15 expired requests and pass as count=1
        MockHttpServletRequest req = new MockHttpServletRequest();
        req.setRequestURI("/api/soldiers");
        req.setRemoteAddr(testIp);
        MockHttpServletResponse res = new MockHttpServletResponse();
        MockFilterChain chain = new MockFilterChain();

        dlpThrottlingFilter.doFilter(req, res, chain);
        assertEquals(HttpStatus.OK.value(), res.getStatus(), "Request after window expiry should pass cleanly");
        assertEquals(1, dlpThrottlingFilter.getRequestCount(testIp), "Count must reset to 1 after sliding window eviction");
    }

    @Test
    @DisplayName("DLP Throttling: Non-sensitive endpoints are completely exempt from DLP rate limiting")
    void testNonSensitiveEndpointsExemptFromDlp() throws Exception {
        String testIp = "198.51.100.224";

        // Burst 30 requests to /api/alerts (which is not a sensitive tactical resource in DLP list)
        for (int i = 1; i <= 30; i++) {
            MockHttpServletRequest req = new MockHttpServletRequest();
            req.setRequestURI("/api/alerts");
            req.setRemoteAddr(testIp);
            MockHttpServletResponse res = new MockHttpServletResponse();
            MockFilterChain chain = new MockFilterChain();

            dlpThrottlingFilter.doFilter(req, res, chain);
            assertEquals(HttpStatus.OK.value(), res.getStatus(), "Non-sensitive endpoint should not be throttled by DLP");
        }

        // DLP filter history should NOT track /api/alerts
        assertEquals(0, dlpThrottlingFilter.getRequestCount(testIp), "DLP filter should not track non-sensitive requests");
    }

    // =========================================================================
    // 3. Superadmin Alert Isolation & Multi-Role RBAC Stress
    // =========================================================================

    @Test
    @DisplayName("Superadmin Alert Isolation: Strictly excludes CYBER_INTRUSION_DETECTED across 6 operational roles")
    void testMultiRoleAlertIsolation() throws Exception {
        alertRepository.deleteAll();

        // Seed 1 tactical engagement alert
        Alert tacticalAlert = new Alert();
        tacticalAlert.setId(UUID.randomUUID().toString());
        tacticalAlert.setType(AlertType.UNIT_ENGAGED);
        tacticalAlert.setSeverity(AlertSeverity.HIGH);
        tacticalAlert.setMessage("Contacto armado en sector Delta");
        tacticalAlert.setTimestamp(System.currentTimeMillis());
        alertRepository.save(tacticalAlert);

        // Seed 1 logistical ammo alert
        Alert ammoAlert = new Alert();
        ammoAlert.setId(UUID.randomUUID().toString());
        ammoAlert.setType(AlertType.AMMO_REPORT_PENDING);
        ammoAlert.setSeverity(AlertSeverity.MEDIUM);
        ammoAlert.setMessage("Reporte de munición pendiente");
        ammoAlert.setTimestamp(System.currentTimeMillis());
        alertRepository.save(ammoAlert);

        // Seed 1 critical cyber intrusion alert
        Alert cyberAlert = new Alert();
        cyberAlert.setId(UUID.randomUUID().toString());
        cyberAlert.setType(AlertType.CYBER_INTRUSION_DETECTED);
        cyberAlert.setSeverity(AlertSeverity.CRITICAL);
        cyberAlert.setMessage("Ataque RASP detectado y neutralizado");
        cyberAlert.setData("{\"vector\":\"SQL_INJECTION\",\"ip\":\"198.51.100.99\"}");
        cyberAlert.setTimestamp(System.currentTimeMillis());
        alertRepository.save(cyberAlert);

        // Operational roles that must NEVER see CYBER_INTRUSION_DETECTED
        String[] operationalRoles = {
                "OFICIAL_OPERACIONES",
                "COMANDANTE_PELOTON",
                "COMANDANTE_COMPANIA",
                "COMANDANTE_BATALLON",
                "OPERADOR",
                "ANALISTA_INTEL"
        };

        for (String role : operationalRoles) {
            String token = jwtUtil.generateToken("user." + role.toLowerCase(), role);

            mockMvc.perform(get("/api/alerts")
                            .header("Authorization", "Bearer " + token))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.length()").value(2))
                    .andExpect(jsonPath("$[?(@.type == 'CYBER_INTRUSION_DETECTED')]").doesNotExist())
                    .andExpect(jsonPath("$[?(@.type == 'UNIT_ENGAGED')]").exists())
                    .andExpect(jsonPath("$[?(@.type == 'AMMO_REPORT_PENDING')]").exists());
        }

        // Superadministrator santiago.salazar / ROLE_ADMINISTRATOR MUST see ALL 3 alerts
        String superAdminToken = jwtUtil.generateToken("santiago.salazar", "ADMINISTRATOR");

        mockMvc.perform(get("/api/alerts")
                        .header("Authorization", "Bearer " + superAdminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(3))
                .andExpect(jsonPath("$[?(@.type == 'CYBER_INTRUSION_DETECTED')]").exists());
    }

    @Test
    @DisplayName("ActiveCyberDefenseService: Intrusion alert forensic JSON payload integrity")
    void testDirectCyberIntrusionAlertPayloadIntegrity() throws Exception {
        String testIp = "198.51.100.77";
        String testUser = "adversary_probe_x";
        String vector = "IMPOSSIBLE_TRAVEL";
        String details = "Bogota to Moscow in 1 second";
        String action = "SESSION_REVOKED";

        Alert alert = activeCyberDefenseService.recordIntrusionAlert(vector, testIp, testUser, details, action);
        assertNotNull(alert);
        assertNotNull(alert.getData());

        // Parse JSON forensic payload
        JsonNode json = objectMapper.readTree(alert.getData());
        assertEquals(vector, json.get("vector").asText());
        assertEquals(testIp, json.get("ip").asText());
        assertEquals(testUser, json.get("username").asText());
        assertEquals(details, json.get("details").asText());
        assertEquals(action, json.get("action").asText());
        assertTrue(json.has("timestamp"));
    }
}