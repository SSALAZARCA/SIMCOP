package com.simcop;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
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
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.io.File;
import java.nio.file.Files;
import java.nio.file.Paths;
import java.util.Optional;
import java.util.regex.Pattern;

import static org.hamcrest.Matchers.containsString;
import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Adversarial Challenger 2 Test Suite:
 * Information Leakage, Hardcoded Secrets, IP 72.62.130.152 Leakage,
 * Sensitive Field Serialization, Error Handling/Stack Trace Leaks, and CSP/Security Headers.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
public class ChallengerLeaksAndCspTests {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ConfigurationService configService;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private JwtUtil jwtUtil;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private LoginRateLimiterService rateLimiterService;

    @Autowired
    private GlobalExceptionHandler globalExceptionHandler;

    // =========================================================================
    // CHALLENGE 1: VULN-005 (Secrets & Gemini API Key Protection)
    // =========================================================================

    @Test
    @DisplayName("Challenger 1.1: GET /api/config/gemini-api-key cannot be coaxed into leaking unmasked secret under any headers/parameters")
    void testGeminiApiKeyCannotBeCoaxedIntoReturningUnmaskedSecret() throws Exception {
        String secret = "AIzaSyD_AdversarialSecretKeyVerification_2026_XYZ999";
        configService.saveGeminiApiKey(secret, "admin");

        // 1. Unauthenticated request must be rejected (401)
        mockMvc.perform(get("/api/config/gemini-api-key"))
                .andExpect(status().isUnauthorized());

        // 2. Scoped PRE_AUTH_2FA token must be rejected (403)
        String preAuthToken = jwtUtil.generatePreAuthToken("admin_preauth");
        mockMvc.perform(get("/api/config/gemini-api-key")
                .header("Authorization", "Bearer " + preAuthToken))
                .andExpect(status().isForbidden());

        // 3. Non-admin high privilege (e.g. COMANDANTE_EJERCITO, OFICIAL_INTELIGENCIA) must be rejected (403)
        String officerToken = jwtUtil.generateToken("coronel_ramirez", "COMANDANTE_BRIGADA");
        mockMvc.perform(get("/api/config/gemini-api-key")
                .header("Authorization", "Bearer " + officerToken))
                .andExpect(status().isForbidden());

        // 4. Admin request with malicious query parameters (attempting raw parameter bypass)
        String adminToken = jwtUtil.generateToken("santiago.salazar", "ADMINISTRATOR");
        MvcResult result = mockMvc.perform(get("/api/config/gemini-api-key")
                .header("Authorization", "Bearer " + adminToken)
                .param("raw", "true")
                .param("unmask", "1")
                .param("format", "cleartext")
                .param("debug", "true"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.configured").value(true))
                .andExpect(jsonPath("$.apiKey").value("AIzaSy...****"))
                .andExpect(jsonPath("$.maskedKey").value("AIzaSy...****"))
                .andReturn();

        String body = result.getResponse().getContentAsString();
        assertFalse(body.contains(secret), "Cleartext API key MUST NEVER be disclosed in response");
        assertFalse(body.contains("AdversarialSecretKeyVerification"), "Secret key payload fragment leaked");
    }

    @Test
    @DisplayName("Challenger 1.2: POST /api/config/gemini-api-key retains existing database secret against empty, masked or asterisks inputs")
    void testGeminiApiKeyPreservedAgainstAdversarialSubmissions() throws Exception {
        String originalSecret = "AIzaSyD_OriginalIntactKeyThatMustNeverBeCorrupted_555";
        configService.saveGeminiApiKey(originalSecret, "admin");

        String adminToken = jwtUtil.generateToken("santiago.salazar", "ADMINISTRATOR");

        // Adversarial inputs that must NOT overwrite the database key:
        String[] benignOrMaskedSubmissions = new String[]{
                "{\"apiKey\":\"AIzaSy...****\"}",
                "{\"apiKey\":\"****\"}",
                "{\"apiKey\":\"***\"}",
                "{\"apiKey\":\"AIzaSy***\"}",
                "{\"apiKey\":\"\"}",
                "{\"apiKey\":\"   \"}",
                "{\"apiKey\":\"\\t\\n \"}",
                "{}"
        };

        for (String payload : benignOrMaskedSubmissions) {
            mockMvc.perform(post("/api/config/gemini-api-key")
                    .header("Authorization", "Bearer " + adminToken)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(payload))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.message").value("Existing API key preserved"));

            // Verify the secret in the database is 100% identical and intact
            Optional<String> activeKey = configService.getGeminiApiKey();
            assertTrue(activeKey.isPresent(), "Key must still exist in DB");
            assertEquals(originalSecret, activeKey.get(),
                    "Database key was corrupted or wiped by payload: " + payload);
        }

        // Submitting a legitimate new secret should successfully update
        String newValidSecret = "AIzaSyD_ValidNewKeyReplacement_2026";
        mockMvc.perform(post("/api/config/gemini-api-key")
                .header("Authorization", "Bearer " + adminToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(String.format("{\"apiKey\":\"%s\"}", newValidSecret)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("API key saved successfully"));

        assertEquals(newValidSecret, configService.getGeminiApiKey().orElse(null),
                "Legitimate key update must be reflected in database");
    }

    // =========================================================================
    // CHALLENGE 2: VULN-006 (Internal Infrastructure & IP 72.62.130.152)
    // =========================================================================

    @Test
    @DisplayName("Challenger 2.1: Non-admin and unauthenticated users CANNOT discover internal IP 72.62.130.152 or port")
    void testNonAdminCannotDiscoverInternalIpOrPort() throws Exception {
        String sensitiveInternalEndpoint = "http://72.62.130.152:11434";
        configService.saveLocalAIEndpoint(sensitiveInternalEndpoint, "admin");

        // 1. Unauthenticated access is blocked at the security filter chain (401 Unauthorized)
        MvcResult unauthResult = mockMvc.perform(get("/api/config/ai-provider"))
                .andExpect(status().isUnauthorized())
                .andReturn();

        String unauthBody = unauthResult.getResponse().getContentAsString();
        assertFalse(unauthBody.contains("72.62.130.152"), "Unauthenticated user discovered internal IP");
        assertFalse(unauthBody.contains("11434"), "Unauthenticated user discovered internal port");
        assertFalse(unauthBody.contains("72.62."), "Unauthenticated user discovered internal subnet");

        // 2. Authenticated non-admin role
        String officerToken = jwtUtil.generateToken("mayor_gomez", "OFICIAL_LOGISTICA");
        MvcResult officerResult = mockMvc.perform(get("/api/config/ai-provider")
                .header("Authorization", "Bearer " + officerToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.localEndpoint").value("[CONFIGURED_INTERNAL]"))
                .andReturn();

        String officerBody = officerResult.getResponse().getContentAsString();
        assertFalse(officerBody.contains("72.62.130.152"), "Non-admin discovered internal IP");
        assertFalse(officerBody.contains("11434"), "Non-admin discovered internal port");
    }

    @Test
    @DisplayName("Challenger 2.2: Admin receives masked IP octets (72.62.***.***) and POST preserves database IP on masked input")
    void testAdminReceivesMaskedIpAndPreservesOnSave() throws Exception {
        String internalEndpoint = "http://72.62.130.152:8000";
        configService.saveLocalAIEndpoint(internalEndpoint, "admin");

        String adminToken = jwtUtil.generateToken("santiago.salazar", "ADMINISTRATOR");

        // Admin GET returns masked octets
        MvcResult adminResult = mockMvc.perform(get("/api/config/ai-provider")
                .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.localEndpoint").value("http://72.62.***.***:8000"))
                .andReturn();

        String adminBody = adminResult.getResponse().getContentAsString();
        assertFalse(adminBody.contains("72.62.130.152"), "Admin must not see unprotected full internal IP");

        // Admin saves masked endpoint or [CONFIGURED_INTERNAL]
        mockMvc.perform(post("/api/config/ai-provider")
                .header("Authorization", "Bearer " + adminToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"provider\":\"LOCAL\",\"localEndpoint\":\"http://72.62.***.***:8000\",\"localModel\":\"llama3\"}"))
                .andExpect(status().isOk());

        // Verify DB still holds the true internal endpoint
        assertEquals(internalEndpoint, configService.getLocalAIEndpoint(),
                "Internal endpoint in DB was corrupted with masked octets");

        mockMvc.perform(post("/api/config/ai-provider")
                .header("Authorization", "Bearer " + adminToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"provider\":\"LOCAL\",\"localEndpoint\":\"[CONFIGURED_INTERNAL]\",\"localModel\":\"llama3\"}"))
                .andExpect(status().isOk());

        assertEquals(internalEndpoint, configService.getLocalAIEndpoint(),
                "Internal endpoint in DB was corrupted with [CONFIGURED_INTERNAL]");
    }

    // =========================================================================
    // CHALLENGE 3: VULN-003 (Sensitive Field Serialization Protection)
    // =========================================================================

    @Test
    @DisplayName("Challenger 3.1: User entity Jackson serialization strictly omits hashedPassword, twoFactorSecret, and totpCode")
    void testUserSerializationOmitsAllSensitiveCredentials() throws Exception {
        User user = new User();
        user.setId("adv-user-id-001");
        user.setUsername("adversarial_agent");
        user.setDisplayName("Adversarial Specialist");
        user.setRole(UserRole.COMANDANTE_BATALLON);
        user.setHashedPassword("$2a$10$TopSecretHashedPasswordMaterialNeverSerializeMe999");
        user.setTwoFactorSecret("ADVERSARIAL_TOTP_SECRET_KEY_NEVER_LEAK");
        user.setTotpCode("123987");
        user.setTwoFactorEnabled(true);

        String serializedJson = objectMapper.writeValueAsString(user);

        assertFalse(serializedJson.contains("twoFactorSecret"), "Key 'twoFactorSecret' must not exist in JSON");
        assertFalse(serializedJson.contains("hashedPassword"), "Key 'hashedPassword' must not exist in JSON");
        assertFalse(serializedJson.contains("totpCode"), "Key 'totpCode' must not exist in JSON");
        assertFalse(serializedJson.contains("TopSecretHashedPasswordMaterialNeverSerializeMe999"), "Password hash leaked");
        assertFalse(serializedJson.contains("ADVERSARIAL_TOTP_SECRET_KEY_NEVER_LEAK"), "2FA secret leaked");
        assertFalse(serializedJson.contains("123987"), "TOTP verification code leaked");
    }

    @Test
    @DisplayName("Challenger 3.2: /api/users and /api/users/login never expose credentials in response payloads")
    void testEndpointsDoNotExposeSecretsInResponses() throws Exception {
        String testUser = "adv_login_user";
        String testPass = "SecureAdversarialPass2026!#$";
        userRepository.findByUsername(testUser).ifPresent(userRepository::delete);

        User user = new User();
        user.setUsername(testUser);
        user.setDisplayName("Adv Login User");
        user.setRole(UserRole.OFICIAL_LOGISTICA);
        user.setHashedPassword(passwordEncoder.encode(testPass));
        user.setTwoFactorEnabled(false);
        user.setTwoFactorSecret("SECRET_TWO_FACTOR_ABC");
        userRepository.save(user);

        rateLimiterService.recordSuccessfulLogin("127.0.0.1", testUser);

        // Login response inspection
        MvcResult loginResult = mockMvc.perform(post("/api/users/login")
                .header("X-Forwarded-For", "127.0.0.1")
                .contentType(MediaType.APPLICATION_JSON)
                .content(String.format("{\"username\":\"%s\",\"hashedPassword\":\"%s\"}", testUser, testPass)))
                .andExpect(status().isOk())
                .andReturn();

        String loginBody = loginResult.getResponse().getContentAsString();
        assertFalse(loginBody.contains("hashedPassword"), "Login response leaked hashedPassword field");
        assertFalse(loginBody.contains("twoFactorSecret"), "Login response leaked twoFactorSecret field");
        assertFalse(loginBody.contains("SECRET_TWO_FACTOR_ABC"), "Login response leaked secret value");
        assertFalse(loginBody.contains("totpCode"), "Login response leaked totpCode");

        userRepository.delete(user);
    }

    // =========================================================================
    // CHALLENGE 4: VULN-008 (Global Exception Handling, Stack Traces & SQL Leaks)
    // =========================================================================

    @Test
    @DisplayName("Challenger 4.1: Malformed JSON fuzzing yields HTTP 400 with correlationId and zero Jackson/Java leakages")
    void testMalformedJsonFuzzing() throws Exception {
        String[] malformedPayloads = new String[]{
                "{\"username\": ",
                "{\"username\": \"test\", \"broken\": }",
                "{malformed_no_quotes: 123",
                "[1, 2, 3]",
                "Not A Json Payload At All",
                "{\"username\": \"test\", \"extra\": \u0000\u001f}"
        };

        for (String payload : malformedPayloads) {
            MvcResult result = mockMvc.perform(post("/api/users/login")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(payload))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.status").value(400))
                    .andExpect(jsonPath("$.error").value("Bad Request"))
                    .andExpect(jsonPath("$.message").value("Malformed JSON request or invalid request body"))
                    .andExpect(jsonPath("$.correlationId").isNotEmpty())
                    .andReturn();

            String body = result.getResponse().getContentAsString();
            assertFalse(body.contains("com.fasterxml.jackson"), "Jackson package leaked in error response");
            assertFalse(body.contains("JsonParseException"), "Jackson exception class leaked");
            assertFalse(body.contains("MismatchedInputException"), "Jackson parser error leaked");
            assertFalse(body.contains(".java:"), "Java source line leaked");
            assertFalse(body.contains("at org.springframework"), "Spring stack trace leaked");
        }
    }

    @Test
    @DisplayName("Challenger 4.2: Critical database/SQL exceptions handled without leaking schema, SQL queries or table names")
    void testDatabaseExceptionsDoNotLeakSqlOrSchema() {
        // Simulate a low-level SQL constraint or table exception
        String simulatedSqlError = "Table 'simcop.military_units' doesn't exist; SQL [SELECT u.id, u.name, u.location_lat FROM military_units u WHERE u.assigned_commander = 'admin']";
        DataIntegrityViolationException sqlEx = new DataIntegrityViolationException(simulatedSqlError);

        ResponseEntity<ErrorResponse> response = globalExceptionHandler.handleGeneralException(sqlEx);

        assertEquals(HttpStatus.INTERNAL_SERVER_ERROR, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals(500, response.getBody().getStatus());
        assertEquals("Internal Server Error", response.getBody().getError());

        String correlationId = response.getBody().getCorrelationId();
        assertNotNull(correlationId);
        assertFalse(correlationId.trim().isEmpty());

        String message = response.getBody().getMessage();
        assertEquals("An internal error occurred. Please contact administrator with correlation ID: " + correlationId, message);

        // Verify zero leakage of SQL query, table, or database details
        assertFalse(message.contains("military_units"), "SQL table name leaked in 500 error message");
        assertFalse(message.contains("SELECT"), "SQL query text leaked in 500 error message");
        assertFalse(message.contains("DataIntegrityViolationException"), "Database exception class leaked");
    }

    // =========================================================================
    // CHALLENGE 5: VULN-007 (CSP Wildcard Eradication & Security Headers)
    // =========================================================================

    @Test
    @DisplayName("Challenger 5.1: Spring Security enforces complete HTTP security headers on all responses")
    void testSpringSecurityHeadersComplete() throws Exception {
        mockMvc.perform(get("/api/health").secure(true))
                .andExpect(header().string("X-Content-Type-Options", "nosniff"))
                .andExpect(header().string("X-Frame-Options", "DENY"))
                .andExpect(header().string("Strict-Transport-Security", containsString("max-age=31536000")))
                .andExpect(header().string("Strict-Transport-Security", containsString("includeSubDomains")))
                .andExpect(header().string("Referrer-Policy", "strict-origin-when-cross-origin"))
                .andExpect(header().string("Content-Security-Policy", "default-src 'self'; frame-ancestors 'none'; object-src 'none'"));
    }

    @Test
    @DisplayName("Challenger 5.2: Static analysis verifies complete eradication of CSP wildcards and presence of security headers in nginx configs")
    void testNginxConfigurationsSecurityHeadersAndNoWildcards() throws Exception {
        String[] nginxPaths = new String[]{
                "c:\\DESARROLLOS\\SIMCOP-main\\nginx.conf",
                "c:\\DESARROLLOS\\SIMCOP-main\\SIGEP\\frontend\\nginx.conf"
        };

        for (String path : nginxPaths) {
            File f = new File(path);
            assertTrue(f.exists(), "Nginx configuration must exist: " + path);
            String content = Files.readString(Paths.get(path));

            // 1. Verify wildcards are completely eradicated
            assertFalse(content.contains("https:;"), "Unbounded 'https:;' wildcard found in " + path);
            assertFalse(content.contains("https: "), "Unbounded 'https: ' wildcard found in " + path);
            assertFalse(content.contains("https://*;"), "Wildcard domain 'https://*;' found in " + path);
            assertFalse(content.contains("wss://*"), "Wildcard WebSocket 'wss://*' found in " + path);
            assertFalse(content.contains("ws://*"), "Wildcard WebSocket 'ws://*' found in " + path);

            // 2. Verify security headers are explicitly present
            assertTrue(content.contains("X-Content-Type-Options \"nosniff\""), "Missing nosniff header in " + path);
            assertTrue(content.contains("X-Frame-Options \"DENY\""), "Missing X-Frame-Options DENY in " + path);
            assertTrue(content.contains("Strict-Transport-Security \"max-age=31536000; includeSubDomains\""), "Missing HSTS in " + path);
            assertTrue(content.contains("Referrer-Policy \"strict-origin-when-cross-origin\""), "Missing Referrer-Policy in " + path);
            assertTrue(content.contains("Permissions-Policy \"geolocation=(), camera=(), microphone=()\""), "Missing Permissions-Policy in " + path);
            assertTrue(content.contains("server_tokens off;"), "server_tokens off missing in " + path);
        }
    }
}
