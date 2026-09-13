package com.simcop;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.simcop.config.DataInitializer;
import com.simcop.dto.ErrorResponse;
import com.simcop.exception.GlobalExceptionHandler;
import com.simcop.model.User;
import com.simcop.model.UserRole;
import com.simcop.repository.UserRepository;
import com.simcop.service.ConfigurationService;
import com.simcop.service.LoginRateLimiterService;
import com.simcop.service.TwoFactorService;
import com.simcop.util.JwtUtil;
import dev.samstevens.totp.code.CodeGenerator;
import dev.samstevens.totp.code.DefaultCodeGenerator;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.util.List;
import java.util.Optional;

import static org.hamcrest.Matchers.containsString;
import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Comprehensive Security Regression Test Suite for SIMCOP v4.0.0.
 * Covers all 8 vulnerabilities across 8 tiers:
 * - Tier 1 (VULN-001): Eradication of Default Credentials & Account Hardening
 * - Tier 2 (VULN-002): Anti-Brute Force & Rate Limiting
 * - Tier 3 (VULN-003): Sensitive Fields Serialization Protection
 * - Tier 4 (VULN-004): Mandatory 2FA for High-Privilege Roles
 * - Tier 5 (VULN-005): Secrets & API Key Masking
 * - Tier 6 (VULN-006): Internal Infrastructure & IP Sanitization
 * - Tier 7 (VULN-007): Hardened HTTP Security Headers
 * - Tier 8 (VULN-008): Global Exception Handling & Error Sanitization
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
public class SecurityRegressionTests {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private JwtUtil jwtUtil;

    @Autowired
    private LoginRateLimiterService rateLimiterService;

    @Autowired
    private TwoFactorService twoFactorService;

    @Autowired
    private ConfigurationService configService;

    @Autowired
    private DataInitializer dataInitializer;

    @Autowired
    private GlobalExceptionHandler globalExceptionHandler;

    @Autowired
    private ObjectMapper objectMapper;

    private static final List<String> TEST_IPS = List.of(
            "127.0.0.1", "192.168.1.50", "192.168.1.51", "192.168.1.52", "192.168.1.53", "10.0.0.99"
    );

    private static final List<String> TEST_USERNAMES = List.of(
            "admin", "santiago.salazar", "brute_victim_user", "retry_after_test_user",
            "reset_counter_test_user", "test_user_me_sec", "admin_without_2fa_test",
            "preauth_isolated_user", "preauth_setup_user", "admin_enrolled_no_code",
            "admin_invalid_totp_user", "admin_valid_totp_user", "vuln001_mock_banned_user"
    );

    @BeforeEach
    void setUp() {
        cleanRateLimiters();
    }

    @AfterEach
    void tearDown() {
        cleanRateLimiters();
    }

    private void cleanRateLimiters() {
        for (String ip : TEST_IPS) {
            for (String user : TEST_USERNAMES) {
                rateLimiterService.recordSuccessfulLogin(ip, user);
            }
        }
    }

    // =========================================================================
    // TIER 1: VULN-001 Eradication of Default Credentials & Account Hardening
    // =========================================================================

    @Test
    @DisplayName("Tier 1 - VULN-001: Login with banned default credentials rejected with HTTP 401 Unauthorized")
    void testLoginWithBannedDefaultCredentialsFails401() throws Exception {
        String clientIp = "127.0.0.1";
        rateLimiterService.recordSuccessfulLogin(clientIp, "admin");

        String[] bannedCredentials = {"password", "admin", "123456"};
        for (String banned : bannedCredentials) {
            String payload = String.format("{\"username\":\"admin\",\"hashedPassword\":\"%s\"}", banned);
            mockMvc.perform(post("/api/users/login")
                    .header("X-Forwarded-For", clientIp)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(payload))
                    .andExpect(status().isUnauthorized())
                    .andExpect(jsonPath("$.error").value("Credenciales inválidas"));
        }
    }

    @Test
    @DisplayName("Tier 1 - VULN-001: Startup scanner revokes banned default passwords to locked UUID hashes")
    void testStartupScansAndRevokesBannedPasswords() {
        String testUsername = "vuln001_mock_banned_user";
        userRepository.findByUsername(testUsername).ifPresent(userRepository::delete);

        User user = new User();
        user.setUsername(testUsername);
        user.setDisplayName("VULN-001 Mock User");
        user.setHashedPassword(passwordEncoder.encode("password123"));
        user.setRole(UserRole.OFICIAL_LOGISTICA);
        userRepository.save(user);

        assertTrue(passwordEncoder.matches("password123",
                userRepository.findByUsername(testUsername).orElseThrow().getHashedPassword()));

        ReflectionTestUtils.invokeMethod(dataInitializer, "scanAndRevokeBannedPasswords", "initialSecurePass", "envPass");

        User updatedUser = userRepository.findByUsername(testUsername).orElseThrow();
        assertNotNull(updatedUser.getHashedPassword());
        assertFalse(passwordEncoder.matches("password123", updatedUser.getHashedPassword()),
                "Banned password 'password123' must be revoked and no longer match");
        assertTrue(updatedUser.getHashedPassword().startsWith("$2"),
                "Revoked password must be replaced by a locked BCrypt hash");

        userRepository.delete(updatedUser);
    }

    @Test
    @DisplayName("Tier 1 - VULN-001: Superadmin santiago.salazar strong hash is preserved and never overwritten")
    void testSuperadminPreservationOnStartup() throws Exception {
        String superadminUsername = "santiago.salazar";
        String customStrongPass = "SantiagoUltraSecurePassword2026!#$";
        String customHash = passwordEncoder.encode(customStrongPass);

        User ss = userRepository.findByUsername(superadminUsername).orElseGet(() -> {
            User u = new User();
            u.setUsername(superadminUsername);
            u.setRole(UserRole.ADMINISTRATOR);
            return u;
        });
        ss.setHashedPassword(customHash);
        userRepository.save(ss);

        // Execute data initialization cycle
        dataInitializer.run();

        User preservedUser = userRepository.findByUsername(superadminUsername).orElseThrow();
        assertEquals(customHash, preservedUser.getHashedPassword(),
                "Superadmin existing custom hash must be preserved without modification");
        assertTrue(passwordEncoder.matches(customStrongPass, preservedUser.getHashedPassword()),
                "Superadmin strong credentials must still authenticate properly");
    }

    @Test
    @DisplayName("Tier 1 - VULN-001: Creating user with weak/banned password rejected with HTTP 400 Bad Request")
    void testCreateUserWithWeakPasswordRejected400() throws Exception {
        String adminToken = jwtUtil.generateToken("santiago.salazar", "ADMINISTRATOR");

        String[] weakPasswords = {"123456", "admin:password", "change-me-immediately", "ssc841209"};
        for (String weakPass : weakPasswords) {
            String testUser = "weak_user_" + System.currentTimeMillis();
            String payload = String.format("{\"username\":\"%s\",\"hashedPassword\":\"%s\",\"displayName\":\"Weak Test User\"}",
                    testUser, weakPass);

            mockMvc.perform(post("/api/users")
                    .header("Authorization", "Bearer " + adminToken)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(payload))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.error").value("La contraseña elegida está en la lista de contraseñas débiles o por defecto prohibidas"));

            assertTrue(userRepository.findByUsername(testUser).isEmpty(),
                    "User with banned weak password must not be persisted in database");
        }
    }

    // =========================================================================
    // TIER 2: VULN-002 Anti-Brute Force & Rate Limiting
    // =========================================================================

    @Test
    @DisplayName("Tier 2 - VULN-002: Sliding window rate limiter triggers HTTP 429 after 5 failed attempts")
    void testRateLimitingTriggers429AfterThreshold() throws Exception {
        String ip = "192.168.1.50";
        String username = "brute_victim_user";
        rateLimiterService.recordSuccessfulLogin(ip, username);

        // 5 consecutive failed login attempts
        for (int i = 1; i <= 5; i++) {
            mockMvc.perform(post("/api/users/login")
                    .header("X-Forwarded-For", ip)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(String.format("{\"username\":\"%s\",\"hashedPassword\":\"wrong_attempt_%d\"}", username, i)))
                    .andExpect(status().isUnauthorized());
        }

        // 6th attempt must trigger HTTP 429 Too Many Requests
        mockMvc.perform(post("/api/users/login")
                .header("X-Forwarded-For", ip)
                .contentType(MediaType.APPLICATION_JSON)
                .content(String.format("{\"username\":\"%s\",\"hashedPassword\":\"wrong_attempt_6\"}", username)))
                .andExpect(status().isTooManyRequests())
                .andExpect(jsonPath("$.status").value(429))
                .andExpect(jsonPath("$.error").value("Too Many Requests"))
                .andExpect(jsonPath("$.message").value("Too many failed login attempts. Please try again later."));

        rateLimiterService.recordSuccessfulLogin(ip, username);
    }

    @Test
    @DisplayName("Tier 2 - VULN-002: HTTP 429 rate limit response contains Retry-After header > 0")
    void testRateLimitingIncludesRetryAfterHeader() throws Exception {
        String ip = "192.168.1.52";
        String username = "retry_after_test_user";
        rateLimiterService.recordSuccessfulLogin(ip, username);

        for (int i = 1; i <= 5; i++) {
            mockMvc.perform(post("/api/users/login")
                    .header("X-Forwarded-For", ip)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(String.format("{\"username\":\"%s\",\"hashedPassword\":\"wrong_%d\"}", username, i)))
                    .andExpect(status().isUnauthorized());
        }

        MvcResult result = mockMvc.perform(post("/api/users/login")
                .header("X-Forwarded-For", ip)
                .contentType(MediaType.APPLICATION_JSON)
                .content(String.format("{\"username\":\"%s\",\"hashedPassword\":\"wrong_6\"}", username)))
                .andExpect(status().isTooManyRequests())
                .andExpect(header().exists("Retry-After"))
                .andReturn();

        String retryAfterStr = result.getResponse().getHeader("Retry-After");
        assertNotNull(retryAfterStr);
        long retryAfterSec = Long.parseLong(retryAfterStr);
        assertTrue(retryAfterSec > 0, "Retry-After header value must be strictly greater than 0");
        assertTrue(retryAfterSec <= 60, "Initial lockout duration should be at most 60 seconds");

        rateLimiterService.recordSuccessfulLogin(ip, username);
    }

    @Test
    @DisplayName("Tier 2 - VULN-002: Successful authentication resets failed attempts counter and lockout")
    void testSuccessfulLoginResetsRateLimit() throws Exception {
        String ip = "192.168.1.53";
        String username = "reset_counter_test_user";
        String password = "ValidPassword2026!#$";

        rateLimiterService.recordSuccessfulLogin(ip, username);

        User user = new User();
        user.setUsername(username);
        user.setDisplayName("Reset User");
        user.setHashedPassword(passwordEncoder.encode(password));
        user.setRole(UserRole.OFICIAL_LOGISTICA);
        user.setTwoFactorEnabled(false);
        userRepository.save(user);

        // 4 failed attempts (1 below threshold)
        for (int i = 1; i <= 4; i++) {
            mockMvc.perform(post("/api/users/login")
                    .header("X-Forwarded-For", ip)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(String.format("{\"username\":\"%s\",\"hashedPassword\":\"wrong_%d\"}", username, i)))
                    .andExpect(status().isUnauthorized());
        }

        // Successful login resets failure counters
        mockMvc.perform(post("/api/users/login")
                .header("X-Forwarded-For", ip)
                .contentType(MediaType.APPLICATION_JSON)
                .content(String.format("{\"username\":\"%s\",\"hashedPassword\":\"%s\"}", username, password)))
                .andExpect(status().isOk());

        assertFalse(rateLimiterService.isBlocked(ip, username),
                "Rate limiter must not be blocked after successful login");

        // 4 more failed attempts should not trigger 429 because counter was reset to 0
        for (int i = 1; i <= 4; i++) {
            mockMvc.perform(post("/api/users/login")
                    .header("X-Forwarded-For", ip)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(String.format("{\"username\":\"%s\",\"hashedPassword\":\"wrong_again_%d\"}", username, i)))
                    .andExpect(status().isUnauthorized());
        }

        assertFalse(rateLimiterService.isBlocked(ip, username),
                "4 attempts after reset must remain below threshold of 5");

        rateLimiterService.recordSuccessfulLogin(ip, username);
        userRepository.delete(user);
    }

    // =========================================================================
    // TIER 3: VULN-003 Sensitive Fields Serialization Protection
    // =========================================================================

    @Test
    @DisplayName("Tier 3 - VULN-003: User entity serialization omits hashedPassword, twoFactorSecret, and totpCode")
    void testUserSerializationOmitsSensitiveFields() throws Exception {
        User user = new User();
        user.setId("test-uuid-vuln003");
        user.setUsername("sanitized_user");
        user.setDisplayName("Sanitized Agent");
        user.setRole(UserRole.OFICIAL_LOGISTICA);
        user.setHashedPassword("$2a$10$supersecretbcrypthashmaterialneverleakthis1234567890");
        user.setTwoFactorSecret("JBSWY3DPEHPK3PXPSECRETKEY999");
        user.setTotpCode("654321");
        user.setTwoFactorEnabled(true);

        String json = objectMapper.writeValueAsString(user);

        assertFalse(json.contains("twoFactorSecret"), "twoFactorSecret field name must NOT appear in JSON");
        assertFalse(json.contains("hashedPassword"), "hashedPassword field name must NOT appear in JSON");
        assertFalse(json.contains("totpCode"), "totpCode field name must NOT appear in JSON");
        assertFalse(json.contains("supersecretbcrypthashmaterial"), "Password hash secret material must NOT appear in JSON");
        assertFalse(json.contains("JBSWY3DPEHPK3PXPSECRETKEY999"), "2FA secret key must NOT appear in JSON");
        assertFalse(json.contains("654321"), "TOTP verification code must NOT appear in JSON");

        assertTrue(json.contains("sanitized_user"), "Public username should be present");
        assertTrue(json.contains("twoFactorEnabled"), "twoFactorEnabled flag should be present");
    }

    @Test
    @DisplayName("Tier 3 - VULN-003: GET /api/users/me response lacks all sensitive credential fields")
    void testUserMeEndpointDoesNotExposeSecrets() throws Exception {
        String username = "test_user_me_sec";
        userRepository.findByUsername(username).ifPresent(userRepository::delete);

        User user = new User();
        user.setUsername(username);
        user.setDisplayName("User Me Test");
        user.setRole(UserRole.OFICIAL_LOGISTICA);
        user.setHashedPassword(passwordEncoder.encode("SecretPass2026!"));
        user.setTwoFactorSecret("JBSWY3DPEHPK3PXPSEC");
        user.setTwoFactorEnabled(false);
        userRepository.save(user);

        String token = jwtUtil.generateToken(username, "OFICIAL_LOGISTICA");

        MvcResult result = mockMvc.perform(get("/api/users/me")
                .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.username").value(username))
                .andExpect(jsonPath("$.hashedPassword").doesNotExist())
                .andExpect(jsonPath("$.twoFactorSecret").doesNotExist())
                .andExpect(jsonPath("$.totpCode").doesNotExist())
                .andReturn();

        String responseBody = result.getResponse().getContentAsString();
        assertFalse(responseBody.contains("twoFactorSecret"), "Response must not contain twoFactorSecret");
        assertFalse(responseBody.contains("hashedPassword"), "Response must not contain hashedPassword");
        assertFalse(responseBody.contains("totpCode"), "Response must not contain totpCode");
        assertFalse(responseBody.contains("JBSWY3DPEHPK3PXPSEC"), "Response must not contain 2FA secret value");

        userRepository.delete(user);
    }

    // =========================================================================
    // TIER 4: VULN-004 Mandatory 2FA for High-Privilege Roles
    // =========================================================================

    @Test
    @DisplayName("Tier 4 - VULN-004: Admin without 2FA returns HTTP 403 2FA_SETUP_REQUIRED with scoped tempToken")
    void testAdminWithout2FAReturns403SetupRequired() throws Exception {
        String adminUser = "admin_without_2fa_test";
        String adminPass = "SecureAdminPass2026!#$";
        userRepository.findByUsername(adminUser).ifPresent(userRepository::delete);

        User user = new User();
        user.setUsername(adminUser);
        user.setDisplayName("Admin Without 2FA");
        user.setRole(UserRole.ADMINISTRATOR);
        user.setHashedPassword(passwordEncoder.encode(adminPass));
        user.setTwoFactorEnabled(false);
        user.setTwoFactorSecret(null);
        userRepository.save(user);

        rateLimiterService.recordSuccessfulLogin("127.0.0.1", adminUser);

        MvcResult result = mockMvc.perform(post("/api/users/login")
                .header("X-Forwarded-For", "127.0.0.1")
                .contentType(MediaType.APPLICATION_JSON)
                .content(String.format("{\"username\":\"%s\",\"hashedPassword\":\"%s\"}", adminUser, adminPass)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.error").value("2FA_SETUP_REQUIRED"))
                .andExpect(jsonPath("$.tempToken").isNotEmpty())
                .andReturn();

        JsonNode node = objectMapper.readTree(result.getResponse().getContentAsString());
        String tempToken = node.get("tempToken").asText();
        assertNotNull(tempToken);
        assertEquals("PRE_AUTH_2FA", jwtUtil.extractRole(tempToken));

        rateLimiterService.recordSuccessfulLogin("127.0.0.1", adminUser);
        userRepository.delete(user);
    }

    @Test
    @DisplayName("Tier 4 - VULN-004: PRE_AUTH_2FA tempToken cannot access operational endpoints (returns HTTP 403)")
    void testPreAuthTokenCannotAccessOperationalEndpoints() throws Exception {
        String tempToken = jwtUtil.generatePreAuthToken("preauth_isolated_user");

        // Operational endpoints must reject pre-auth token
        mockMvc.perform(get("/api/military-units")
                .header("Authorization", "Bearer " + tempToken))
                .andExpect(status().isForbidden());

        mockMvc.perform(get("/api/units")
                .header("Authorization", "Bearer " + tempToken))
                .andExpect(status().isForbidden());

        mockMvc.perform(get("/api/users")
                .header("Authorization", "Bearer " + tempToken))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("Tier 4 - VULN-004: PRE_AUTH_2FA tempToken is permitted to access 2FA setup endpoint /api/2fa/generate")
    void testPreAuthTokenCanAccess2FASetup() throws Exception {
        String username = "preauth_setup_user";
        userRepository.findByUsername(username).ifPresent(userRepository::delete);

        User user = new User();
        user.setUsername(username);
        user.setDisplayName("PreAuth Setup User");
        user.setRole(UserRole.ADMINISTRATOR);
        user.setHashedPassword(passwordEncoder.encode("SomePass2026!"));
        user.setTwoFactorEnabled(false);
        userRepository.save(user);

        String tempToken = jwtUtil.generatePreAuthToken(username);

        mockMvc.perform(get("/api/2fa/generate")
                .header("Authorization", "Bearer " + tempToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.manualSecret").isNotEmpty())
                .andExpect(jsonPath("$.qrCodeUri").isNotEmpty());

        userRepository.delete(user);
    }

    @Test
    @DisplayName("Tier 4 - VULN-004: Admin with 2FA enabled logging in without TOTP code returns HTTP 403 2FA_REQUIRED")
    void testAdminWith2FAWithoutTotpReturns403() throws Exception {
        String adminUser = "admin_enrolled_no_code";
        String adminPass = "SecureEnrolledPass2026!#$";
        userRepository.findByUsername(adminUser).ifPresent(userRepository::delete);

        User user = new User();
        user.setUsername(adminUser);
        user.setDisplayName("Admin 2FA Enrolled");
        user.setRole(UserRole.ADMINISTRATOR);
        user.setHashedPassword(passwordEncoder.encode(adminPass));
        user.setTwoFactorEnabled(true);
        user.setTwoFactorSecret("JBSWY3DPEHPK3PXP");
        userRepository.save(user);

        rateLimiterService.recordSuccessfulLogin("127.0.0.1", adminUser);

        mockMvc.perform(post("/api/users/login")
                .header("X-Forwarded-For", "127.0.0.1")
                .contentType(MediaType.APPLICATION_JSON)
                .content(String.format("{\"username\":\"%s\",\"hashedPassword\":\"%s\"}", adminUser, adminPass)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.error").value("2FA_REQUIRED"));

        rateLimiterService.recordSuccessfulLogin("127.0.0.1", adminUser);
        userRepository.delete(user);
    }

    @Test
    @DisplayName("Tier 4 - VULN-004: Admin with 2FA logging in with invalid TOTP code returns HTTP 403 INVALID_2FA_CODE")
    void testAdminWithInvalidTotpReturns403() throws Exception {
        String adminUser = "admin_invalid_totp_user";
        String adminPass = "SecureEnrolledPass2026!#$";
        userRepository.findByUsername(adminUser).ifPresent(userRepository::delete);

        User user = new User();
        user.setUsername(adminUser);
        user.setDisplayName("Admin Invalid TOTP");
        user.setRole(UserRole.ADMINISTRATOR);
        user.setHashedPassword(passwordEncoder.encode(adminPass));
        user.setTwoFactorEnabled(true);
        user.setTwoFactorSecret("JBSWY3DPEHPK3PXP");
        userRepository.save(user);

        rateLimiterService.recordSuccessfulLogin("127.0.0.1", adminUser);

        mockMvc.perform(post("/api/users/login")
                .header("X-Forwarded-For", "127.0.0.1")
                .contentType(MediaType.APPLICATION_JSON)
                .content(String.format("{\"username\":\"%s\",\"hashedPassword\":\"%s\",\"totpCode\":\"000000\"}", adminUser, adminPass)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.error").value("INVALID_2FA_CODE"));

        rateLimiterService.recordSuccessfulLogin("127.0.0.1", adminUser);
        userRepository.delete(user);
    }

    @Test
    @DisplayName("Tier 4 - VULN-004: Admin with 2FA logging in with valid TOTP code returns HTTP 200 and full session JWT")
    void testAdminWithValidTotpReturnsFullJWT() throws Exception {
        String adminUser = "admin_valid_totp_user";
        String adminPass = "SecureEnrolledPass2026!#$";
        String secret = "JBSWY3DPEHPK3PXP";
        userRepository.findByUsername(adminUser).ifPresent(userRepository::delete);

        User user = new User();
        user.setUsername(adminUser);
        user.setDisplayName("Admin Valid TOTP");
        user.setRole(UserRole.ADMINISTRATOR);
        user.setHashedPassword(passwordEncoder.encode(adminPass));
        user.setTwoFactorEnabled(true);
        user.setTwoFactorSecret(secret);
        userRepository.save(user);

        rateLimiterService.recordSuccessfulLogin("127.0.0.1", adminUser);

        CodeGenerator codeGenerator = new DefaultCodeGenerator();
        long currentBucket = Math.floorDiv(System.currentTimeMillis() / 1000L, 30L);
        String validTotp = codeGenerator.generate(secret, currentBucket);

        MvcResult result = mockMvc.perform(post("/api/users/login")
                .header("X-Forwarded-For", "127.0.0.1")
                .contentType(MediaType.APPLICATION_JSON)
                .content(String.format("{\"username\":\"%s\",\"hashedPassword\":\"%s\",\"totpCode\":\"%s\"}", adminUser, adminPass, validTotp)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").isNotEmpty())
                .andExpect(jsonPath("$.username").value(adminUser))
                .andReturn();

        JsonNode node = objectMapper.readTree(result.getResponse().getContentAsString());
        String fullToken = node.get("token").asText();
        assertEquals("ADMINISTRATOR", jwtUtil.extractRole(fullToken),
                "Authenticated admin must receive full ADMINISTRATOR JWT token");

        rateLimiterService.recordSuccessfulLogin("127.0.0.1", adminUser);
        userRepository.delete(user);
    }

    // =========================================================================
    // TIER 5: VULN-005 Secrets & API Key Masking
    // =========================================================================

    @Test
    @DisplayName("Tier 5 - VULN-005: GET /api/config/gemini-api-key returns masked key AIzaSy...**** and configured: true")
    void testGetGeminiApiKeyReturnsMaskedKey() throws Exception {
        String rawSecretKey = "AIzaSyD-RealGeminiSecretKey2026abcdef123456";
        configService.saveGeminiApiKey(rawSecretKey, "admin");

        String adminToken = jwtUtil.generateToken("santiago.salazar", "ADMINISTRATOR");

        MvcResult result = mockMvc.perform(get("/api/config/gemini-api-key")
                .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.configured").value(true))
                .andExpect(jsonPath("$.apiKey").value("AIzaSy...****"))
                .andExpect(jsonPath("$.maskedKey").value("AIzaSy...****"))
                .andReturn();

        String responseBody = result.getResponse().getContentAsString();
        assertFalse(responseBody.contains(rawSecretKey),
                "Cleartext API key must NEVER be leaked in HTTP response");
    }

    @Test
    @DisplayName("Tier 5 - VULN-005: POST /api/config/gemini-api-key with masked input preserves active secret in database")
    void testPostGeminiApiKeyPreservesExistingOnMaskedInput() throws Exception {
        String originalSecretKey = "AIzaSyD-PreservedSecretValue987654321";
        configService.saveGeminiApiKey(originalSecretKey, "admin");

        String adminToken = jwtUtil.generateToken("santiago.salazar", "ADMINISTRATOR");

        // Submit masked key containing asterisks
        mockMvc.perform(post("/api/config/gemini-api-key")
                .header("Authorization", "Bearer " + adminToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"apiKey\":\"AIzaSy...****\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("Existing API key preserved"));

        // Verify raw secret in database is completely intact and not overwritten with asterisks
        Optional<String> activeKeyOpt = configService.getGeminiApiKey();
        assertTrue(activeKeyOpt.isPresent());
        assertEquals(originalSecretKey, activeKeyOpt.get(),
                "Existing API key in database must be preserved when masked key with asterisks is submitted");
    }

    // =========================================================================
    // TIER 6: VULN-006 Internal Infrastructure & IP Sanitization
    // =========================================================================

    @Test
    @DisplayName("Tier 6 - VULN-006: GET /api/config/ai-provider sanitizes internal IP 72.62.130.152 to [CONFIGURED_INTERNAL] for non-admin")
    void testGetAIProviderSanitizesInternalIpForNonAdmin() throws Exception {
        String internalEndpoint = "http://72.62.130.152:11434";
        configService.saveLocalAIEndpoint(internalEndpoint, "admin");

        String analystToken = jwtUtil.generateToken("analyst_viewer", "OFICIAL_LOGISTICA");

        MvcResult result = mockMvc.perform(get("/api/config/ai-provider")
                .header("Authorization", "Bearer " + analystToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.localEndpoint").value("[CONFIGURED_INTERNAL]"))
                .andReturn();

        String responseBody = result.getResponse().getContentAsString();
        assertFalse(responseBody.contains("72.62.130.152"),
                "Internal IP 72.62.130.152 must NOT be disclosed to non-admin");
        assertFalse(responseBody.contains("11434"),
                "Internal port 11434 must NOT be disclosed to non-admin");
    }

    @Test
    @DisplayName("Tier 6 - VULN-006: GET /api/config/ai-provider masks IP octets to 72.62.***.***:11434 for administrator")
    void testGetAIProviderMasksOctetsForAdmin() throws Exception {
        String internalEndpoint = "http://72.62.130.152:11434";
        configService.saveLocalAIEndpoint(internalEndpoint, "admin");

        String adminToken = jwtUtil.generateToken("santiago.salazar", "ADMINISTRATOR");

        MvcResult result = mockMvc.perform(get("/api/config/ai-provider")
                .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.localEndpoint").value("http://72.62.***.***:11434"))
                .andReturn();

        String responseBody = result.getResponse().getContentAsString();
        assertFalse(responseBody.contains("72.62.130.152"),
                "Full unprotected IP 72.62.130.152 must not be exposed even to admin");
    }

    // =========================================================================
    // TIER 7: VULN-007 Hardened HTTP Security Headers
    // =========================================================================

    @Test
    @DisplayName("Tier 7 - VULN-007: Spring Security enforces complete suite of hardened HTTP security headers")
    void testHttpSecurityHeadersPresent() throws Exception {
        mockMvc.perform(get("/api/health").secure(true))
                .andExpect(header().string("X-Content-Type-Options", "nosniff"))
                .andExpect(header().string("X-Frame-Options", "DENY"))
                .andExpect(header().exists("Strict-Transport-Security"))
                .andExpect(header().string("Strict-Transport-Security", containsString("max-age=31536000")))
                .andExpect(header().string("Strict-Transport-Security", containsString("includeSubDomains")))
                .andExpect(header().string("Referrer-Policy", "strict-origin-when-cross-origin"))
                .andExpect(header().string("Content-Security-Policy", "default-src 'self'; frame-ancestors 'none'; object-src 'none'"));
    }

    // =========================================================================
    // TIER 8: VULN-008 Global Exception Handling & Error Sanitization
    // =========================================================================

    @Test
    @DisplayName("Tier 8 - VULN-008: Malformed JSON returns HTTP 400 with correlationId and no stack traces")
    void testMalformedJsonReturns400WithCorrelationId() throws Exception {
        MvcResult result = mockMvc.perform(post("/api/users/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{ malformed json syntax: \"broken\", "))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.error").value("Bad Request"))
                .andExpect(jsonPath("$.message").value("Malformed JSON request or invalid request body"))
                .andExpect(jsonPath("$.correlationId").isNotEmpty())
                .andReturn();

        String body = result.getResponse().getContentAsString();
        assertFalse(body.contains("com.fasterxml.jackson"), "Response must not leak Jackson internal classes");
        assertFalse(body.contains("Exception"), "Response must not leak exception class names");
        assertFalse(body.contains(".java:"), "Response must not leak Java source line numbers");
        assertFalse(body.contains("at org.springframework"), "Response must not leak stack traces");
    }

    @Test
    @DisplayName("Tier 8 - VULN-008: Unhandled exceptions return HTTP 500 with correlationId and zero leaked stack traces")
    void testGeneralExceptionReturns500WithCorrelationId() {
        Exception simulatedEx = new NullPointerException("Simulated critical unhandled internal error");
        ResponseEntity<ErrorResponse> response = globalExceptionHandler.handleGeneralException(simulatedEx);

        assertEquals(HttpStatus.INTERNAL_SERVER_ERROR, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals(500, response.getBody().getStatus());
        assertEquals("Internal Server Error", response.getBody().getError());
        assertNotNull(response.getBody().getCorrelationId());
        assertFalse(response.getBody().getCorrelationId().trim().isEmpty());

        String message = response.getBody().getMessage();
        assertTrue(message.contains("An internal error occurred. Please contact administrator with correlation ID: " + response.getBody().getCorrelationId()));
        assertFalse(message.contains("NullPointerException"), "Error message must not disclose Java exception type");
        assertFalse(message.contains("Simulated critical unhandled internal error"), "Error message must not leak root cause details");
    }
}
