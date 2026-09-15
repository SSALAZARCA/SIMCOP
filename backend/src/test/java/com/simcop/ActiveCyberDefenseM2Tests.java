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
import com.simcop.util.GeoUtils;
import com.simcop.util.JwtUtil;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
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
 * Verification test suite for Milestone 2:
 * Active Cyber Defense (Session Anomaly, Impossible Travel, DLP Throttling,
 * Superadmin-Exclusive C2 Alerts & Telegram Alerting).
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
public class ActiveCyberDefenseM2Tests {

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
    private TelegramService telegramService;

    @Autowired
    private JwtUtil jwtUtil;

    @Autowired
    private ObjectMapper objectMapper;

    private static final String IP_BOGOTA_1 = "190.25.1.1";
    private static final String IP_BOGOTA_2 = "181.50.1.1";
    private static final String IP_MOSCOW = "178.62.1.1";
    private static final String IP_WASHINGTON = "198.51.100.5";
    private static final String IP_FRANKFURT = "80.249.1.1";

    @BeforeEach
    @AfterEach
    void cleanState() {
        sessionTrackingService.clear();
        dlpThrottlingFilter.clear();
        rateLimiterService.unblacklistIp(IP_BOGOTA_1);
        rateLimiterService.unblacklistIp(IP_BOGOTA_2);
        rateLimiterService.unblacklistIp(IP_MOSCOW);
        rateLimiterService.unblacklistIp(IP_WASHINGTON);
        rateLimiterService.unblacklistIp(IP_FRANKFURT);
        rateLimiterService.unblacklistIp("198.51.100.88");
        rateLimiterService.unblacklistIp("198.51.100.99");
    }

    // =========================================================================
    // 1. GeoIpService Air-Gapped Resolution Tests
    // =========================================================================

    @Test
    @DisplayName("GeoIpService: Resolves private, Colombian, and foreign subnets deterministically")
    void testGeoIpServiceResolution() {
        // Private & Localhost
        assertEquals(GeoIpService.BOGOTA_HQ.getLat(), geoIpService.resolveIp("127.0.0.1").getLat(), 0.001);
        assertEquals(GeoIpService.BOGOTA_HQ.getLon(), geoIpService.resolveIp("10.0.5.1").getLon(), 0.001);
        assertEquals(GeoIpService.BOGOTA_HQ.getLat(), geoIpService.resolveIp("192.168.1.100").getLat(), 0.001);
        assertEquals(GeoIpService.BOGOTA_HQ.getLat(), geoIpService.resolveIp("172.16.5.1").getLat(), 0.001);
        assertEquals(GeoIpService.BOGOTA_HQ.getLat(), geoIpService.resolveIp("::1").getLat(), 0.001);

        // Colombian Telecom Subnets
        assertEquals(GeoIpService.BOGOTA_HQ.getLat(), geoIpService.resolveIp("181.50.1.1").getLat(), 0.001);
        assertEquals(GeoIpService.BOGOTA_HQ.getLat(), geoIpService.resolveIp("190.25.1.2").getLat(), 0.001);
        assertEquals(GeoIpService.BOGOTA_HQ.getLat(), geoIpService.resolveIp("186.80.2.3").getLat(), 0.001);
        assertEquals(GeoIpService.BOGOTA_HQ.getLat(), geoIpService.resolveIp("200.21.5.6").getLat(), 0.001);

        // Russia Subnets -> Moscow
        assertEquals(GeoIpService.MOSCOW_RU.getLat(), geoIpService.resolveIp("178.62.1.2").getLat(), 0.001);
        assertEquals(GeoIpService.MOSCOW_RU.getLon(), geoIpService.resolveIp("95.173.136.2").getLon(), 0.001);
        assertEquals(GeoIpService.MOSCOW_RU.getLat(), geoIpService.resolveIp("188.120.240.1").getLat(), 0.001);
        assertEquals(GeoIpService.MOSCOW_RU.getLat(), geoIpService.resolveIp("91.108.4.1").getLat(), 0.001);

        // USA Subnets -> Washington DC / Ashburn
        assertEquals(GeoIpService.WASHINGTON_US.getLat(), geoIpService.resolveIp("54.210.1.1").getLat(), 0.001);
        assertEquals(GeoIpService.WASHINGTON_US.getLon(), geoIpService.resolveIp("3.80.1.2").getLon(), 0.001);
        assertEquals(GeoIpService.WASHINGTON_US.getLat(), geoIpService.resolveIp("198.51.100.1").getLat(), 0.001);
        assertEquals(GeoIpService.WASHINGTON_US.getLat(), geoIpService.resolveIp("128.0.0.1").getLat(), 0.001);

        // Europe Subnets -> Frankfurt
        assertEquals(GeoIpService.FRANKFURT_EU.getLat(), geoIpService.resolveIp("80.249.1.1").getLat(), 0.001);
        assertEquals(GeoIpService.FRANKFURT_EU.getLon(), geoIpService.resolveIp("82.165.1.2").getLon(), 0.001);
        assertEquals(GeoIpService.FRANKFURT_EU.getLat(), geoIpService.resolveIp("195.130.1.3").getLat(), 0.001);

        // Robustness: port stripping and XFF handling
        assertEquals(GeoIpService.WASHINGTON_US.getLat(), geoIpService.resolveIp("198.51.100.1:8080").getLat(), 0.001);
        assertEquals(GeoIpService.MOSCOW_RU.getLat(), geoIpService.resolveIp("178.62.1.2, 10.0.0.1").getLat(), 0.001);
        assertEquals(GeoIpService.BOGOTA_HQ.getLat(), geoIpService.resolveIp(null).getLat(), 0.001);
        assertEquals(GeoIpService.BOGOTA_HQ.getLat(), geoIpService.resolveIp("").getLat(), 0.001);
    }

    // =========================================================================
    // 2. SessionTrackingService Thread-Safe Lifecycle Tests
    // =========================================================================

    @Test
    @DisplayName("SessionTrackingService: Records, tracks, and revokes sessions correctly")
    void testSessionTrackingLifecycle() {
        String username = "coronel.mendoza";
        String token1 = "jwt-test-token-111";
        String ip1 = "190.25.1.1";
        GeoLocation loc1 = GeoIpService.BOGOTA_HQ;
        long t1 = System.currentTimeMillis();

        sessionTrackingService.recordUserSession(username, token1, ip1, loc1, t1);
        UserSessionRecord session = sessionTrackingService.getLastSession(username);
        assertNotNull(session);
        assertEquals(username, session.getUsername());
        assertEquals(token1, session.getToken());
        assertEquals(ip1, session.getIp());
        assertEquals(loc1.getLat(), session.getLoc().getLat(), 0.001);

        // Before revocation: token is not revoked
        assertFalse(sessionTrackingService.isTokenRevoked(token1, username));

        // Revoke single token
        sessionTrackingService.revokeToken(token1);
        assertTrue(sessionTrackingService.isTokenRevoked(token1, username));

        // Revoke user
        String token2 = "jwt-test-token-222";
        sessionTrackingService.recordUserSession(username, token2, ip1, loc1, System.currentTimeMillis());
        sessionTrackingService.revokeUser(username);
        assertTrue(sessionTrackingService.isTokenRevoked(token2, username));
    }

    // =========================================================================
    // 3. Impossible Travel Velocity Anomaly & Revocation Tests
    // =========================================================================

    @Test
    @DisplayName("ImpossibleTravelService: Normal relocation allowed, impossible velocity triggers revocation and C2 alert")
    void testImpossibleTravelDetectionAndRevocation() {
        String username = "capitan.vargas";
        String token = jwtUtil.generateToken(username, "OFICIAL_OPERACIONES");

        // 1. Initial login at Command HQ (Bogotá)
        GeoLocation bogota = GeoIpService.BOGOTA_HQ;
        long loginTime = System.currentTimeMillis();
        sessionTrackingService.recordUserSession(username, token, IP_BOGOTA_1, bogota, loginTime);

        // 2. Benign activity: Another request from Bogotá (same city)
        boolean anomaly1 = impossibleTravelService.checkTravelAnomaly(username, IP_BOGOTA_2, token);
        assertFalse(anomaly1, "Relocation within same city should NOT trigger impossible travel");
        assertFalse(sessionTrackingService.isTokenRevoked(token, username), "Token should remain valid");

        // 3. Impossible Travel Anomaly: Request from Moscow 2 seconds later (~10,800 km in 2s -> speed > 10,000,000 km/h)
        boolean anomaly2 = impossibleTravelService.checkTravelAnomaly(username, IP_MOSCOW, token);
        assertTrue(anomaly2, "Relocation from Bogotá to Moscow in 2 seconds MUST trigger impossible travel");

        // 4. Verify session is revoked immediately
        assertTrue(sessionTrackingService.isTokenRevoked(token, username), "User token MUST be revoked upon impossible travel");

        // 5. Verify C2 Alert was created in AlertRepository
        List<Alert> alerts = alertRepository.findAll();
        Alert intrusionAlert = alerts.stream()
                .filter(a -> a.getType() == AlertType.CYBER_INTRUSION_DETECTED && username.equals(a.getUserId()))
                .findFirst()
                .orElse(null);

        assertNotNull(intrusionAlert, "Intrusion alert MUST be persisted in AlertRepository");
        assertEquals(AlertSeverity.CRITICAL, intrusionAlert.getSeverity());
        assertNotNull(intrusionAlert.getData());
        assertTrue(intrusionAlert.getData().contains("IMPOSSIBLE_TRAVEL"));
        assertTrue(intrusionAlert.getData().contains(IP_MOSCOW));
        assertTrue(intrusionAlert.getData().contains("SESSION_REVOKED"));
    }

    // =========================================================================
    // 4. JwtAuthenticationFilter Revocation Enforcement Tests
    // =========================================================================

    @Test
    @DisplayName("JwtAuthenticationFilter: Rejects requests with revoked tokens with HTTP 401")
    void testJwtFilterRejectsRevokedTokens() throws Exception {
        String username = "teniente.silva";
        String token = jwtUtil.generateToken(username, "COMANDANTE_PELOTON");

        // Valid session recorded
        sessionTrackingService.recordUserSession(username, token, IP_BOGOTA_1, GeoIpService.BOGOTA_HQ, System.currentTimeMillis());

        // Revoke the session for teniente.silva
        sessionTrackingService.revokeUser(username);

        // Attempting to access protected endpoint with revoked token returns HTTP 401
        mockMvc.perform(get("/api/soldiers")
                        .header("Authorization", "Bearer " + token)
                        .header("X-Forwarded-For", IP_BOGOTA_1))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.error").value("Session revoked due to anomalous security event"));
    }

    // =========================================================================
    // 5. DLP Anti-Scraping Throttling Tests
    // =========================================================================

    @Test
    @DisplayName("DlpThrottlingFilter: Allows <=15 reqs, delays 16-25, and locks down with 429 on >25 reqs")
    void testDlpAntiScrapingThrottling() throws Exception {
        String testIp = "198.51.100.88";
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setRequestURI("/api/soldiers");
        request.setRemoteAddr(testIp);

        // 1. First 15 requests pass normally without delay
        for (int i = 1; i <= 15; i++) {
            MockHttpServletResponse res = new MockHttpServletResponse();
            MockFilterChain chain = new MockFilterChain();
            dlpThrottlingFilter.doFilter(request, res, chain);
            assertEquals(HttpStatus.OK.value(), res.getStatus(), "Request " + i + " should pass normally");
        }

        // 2. Requests 16 and 17 receive progressive tarpit delay (Tier 2: 400ms, 800ms)
        for (int i = 16; i <= 17; i++) {
            MockHttpServletResponse res = new MockHttpServletResponse();
            MockFilterChain chain = new MockFilterChain();
            long start = System.currentTimeMillis();
            dlpThrottlingFilter.doFilter(request, res, chain);
            long duration = System.currentTimeMillis() - start;
            assertEquals(HttpStatus.OK.value(), res.getStatus(), "Request " + i + " should pass with delay");
            assertTrue(duration >= 350, "Request " + i + " should have progressive delay applied");
        }

        // 3. Fast-forward burst to request 25 to simulate rapid scraping without exceeding the 10s sliding window
        long now = System.currentTimeMillis();
        for (int i = 18; i <= 25; i++) {
            dlpThrottlingFilter.recordRequest(testIp, now);
        }

        // 4. Request 26 breaches the threshold (> 25 requests / 10s) -> HTTP 429 Too Many Requests
        MockHttpServletResponse res26 = new MockHttpServletResponse();
        MockFilterChain chain26 = new MockFilterChain();
        dlpThrottlingFilter.doFilter(request, res26, chain26);
        assertEquals(HttpStatus.TOO_MANY_REQUESTS.value(), res26.getStatus(), "Request 26 must return HTTP 429");
        assertEquals("60", res26.getHeader("Retry-After"));
        assertTrue(res26.getContentAsString().contains("Massive automated scraping burst detected"));

        // 5. Confirm an intrusion alert was recorded in AlertRepository
        List<Alert> alerts = alertRepository.findAll();
        boolean foundDlpAlert = alerts.stream().anyMatch(a ->
                a.getType() == AlertType.CYBER_INTRUSION_DETECTED &&
                a.getData() != null && a.getData().contains("DLP_SCRAPING_BURST"));
        assertTrue(foundDlpAlert, "DLP scraping burst must trigger CYBER_INTRUSION_DETECTED alert");
    }

    // =========================================================================
    // 6. Superadmin-Exclusive C2 Alert Filtering Tests
    // =========================================================================

    @Test
    @DisplayName("AlertController: Superadmin sees CYBER_INTRUSION_DETECTED; operational roles strictly excluded")
    void testSuperadminExclusiveAlertFiltering() throws Exception {
        // Clear alerts and seed two alerts: one tactical, one cyber intrusion
        alertRepository.deleteAll();

        Alert tacticalAlert = new Alert();
        tacticalAlert.setId(UUID.randomUUID().toString());
        tacticalAlert.setType(AlertType.UNIT_ENGAGED);
        tacticalAlert.setSeverity(AlertSeverity.HIGH);
        tacticalAlert.setMessage("Pelotón Cóndor en contacto con enemigo");
        tacticalAlert.setTimestamp(System.currentTimeMillis());
        alertRepository.save(tacticalAlert);

        Alert cyberAlert = new Alert();
        cyberAlert.setId(UUID.randomUUID().toString());
        cyberAlert.setType(AlertType.CYBER_INTRUSION_DETECTED);
        cyberAlert.setSeverity(AlertSeverity.CRITICAL);
        cyberAlert.setMessage("Intrusión RASP interceptada");
        cyberAlert.setData("{\"vector\":\"SQL_INJECTION\",\"ip\":\"198.51.100.99\"}");
        cyberAlert.setTimestamp(System.currentTimeMillis());
        alertRepository.save(cyberAlert);

        // 1. Operational User (Non-Superadmin: OFICIAL_OPERACIONES) queries GET /api/alerts
        // Should only receive tactical alert; cyber alert MUST be excluded
        String operationalToken = jwtUtil.generateToken("capitan.perez", "OFICIAL_OPERACIONES");

        mockMvc.perform(get("/api/alerts")
                        .header("Authorization", "Bearer " + operationalToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].type").value("UNIT_ENGAGED"));

        // 2. Superadministrator (santiago.salazar / ROLE_ADMINISTRATOR) queries GET /api/alerts
        // Should receive ALL alerts including CYBER_INTRUSION_DETECTED
        String superAdminToken = jwtUtil.generateToken("santiago.salazar", "ADMINISTRATOR");

        mockMvc.perform(get("/api/alerts")
                        .header("Authorization", "Bearer " + superAdminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2));
    }

    // =========================================================================
    // 7. ActiveCyberDefenseService Central Coordinator Tests
    // =========================================================================

    @Test
    @DisplayName("ActiveCyberDefenseService: Central coordinator isolates IP, logs audit, saves C2 alert, dispatches Telegram")
    void testActiveCyberDefenseCoordinator() {
        String testIp = "198.51.100.99";
        String testUser = "adversary_probe";
        String vector = "CANARY_ENDPOINT_TRIGGERED";
        String details = "Attempted access to /.env";
        String action = "IP_ISOLATED_24H";

        Alert savedAlert = activeCyberDefenseService.recordIntrusionAlert(vector, testIp, testUser, details, action);

        assertNotNull(savedAlert);
        assertNotNull(savedAlert.getId());
        assertEquals(AlertType.CYBER_INTRUSION_DETECTED, savedAlert.getType());
        assertEquals(AlertSeverity.CRITICAL, savedAlert.getSeverity());

        // Verify IP is blacklisted in rate limiter
        assertTrue(rateLimiterService.isBlocked(testIp, null));

        // Verify AdminAuditLog entry
        List<AdminAuditLog> auditLogs = auditLogRepository.findAll();
        boolean foundAudit = auditLogs.stream().anyMatch(log ->
                ("ACTIVE_CYBER_DEFENSE".equals(log.getUsername()) || "ACTIVE_CYBER_DEFENSE".equals(log.getAction())) &&
                log.getDetails() != null && log.getDetails().contains("CANARY_ENDPOINT_TRIGGERED"));
        assertTrue(foundAudit, "AdminAuditLog must record the ACD event");
    }

    // =========================================================================
    // 8. TelegramService Cyber Alert Dispatch Resilience Tests
    // =========================================================================

    @Test
    @DisplayName("TelegramService: sendCyberIntrusionAlert handles missing/present bot token without throwing")
    void testTelegramCyberAlertResilience() {
        Alert testAlert = new Alert();
        testAlert.setId(UUID.randomUUID().toString());
        testAlert.setType(AlertType.CYBER_INTRUSION_DETECTED);
        testAlert.setSeverity(AlertSeverity.CRITICAL);
        testAlert.setTimestamp(System.currentTimeMillis());
        testAlert.setMessage("Prueba de notificación ACD");
        testAlert.setData("{\"vector\":\"IMPOSSIBLE_TRAVEL\",\"ip\":\"178.62.1.1\",\"action\":\"SESSION_REVOKED\"}");

        // In test environment without valid Telegram bot token, the method logs a warning
        // and returns false safely without throwing uncaught exceptions
        assertDoesNotThrow(() -> {
            boolean result = telegramService.sendCyberIntrusionAlert(testAlert);
            assertFalse(result, "Should return false gracefully when no Telegram bot token/chat ID is configured in test");
        });
    }
}
