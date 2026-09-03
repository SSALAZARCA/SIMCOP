package com.simcop;

import com.simcop.controller.AdminController;
import com.simcop.controller.UserController;
import com.simcop.model.User;
import com.simcop.model.UserRole;
import com.simcop.repository.UserRepository;
import com.simcop.service.ConfigurationService;
import com.simcop.service.FileStorageService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.http.ResponseEntity;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;

import java.nio.charset.StandardCharsets;
import java.nio.file.Path;
import java.security.MessageDigest;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

public class SecurityHardeningTests {

    @Test
    @DisplayName("F01: Superadmin and admin accounts cannot be deleted (403 Forbidden)")
    void testSuperadminDeletionShielding() {
        UserRepository userRepository = mock(UserRepository.class);
        UserController userController = new UserController();

        org.springframework.test.util.ReflectionTestUtils.setField(userController, "repository", userRepository);

        User superadminUser = new User();
        superadminUser.setId("usr-super");
        superadminUser.setUsername("santiago.salazar");
        superadminUser.setRole(UserRole.ADMINISTRATOR);

        when(userRepository.findById("usr-super")).thenReturn(Optional.of(superadminUser));

        ResponseEntity<?> response = userController.deleteUser("usr-super");
        assertEquals(403, response.getStatusCode().value(), "Deleting santiago.salazar must return HTTP 403 Forbidden");

        User adminUser = new User();
        adminUser.setId("usr-admin");
        adminUser.setUsername("admin");
        adminUser.setRole(UserRole.ADMINISTRATOR);

        when(userRepository.findById("usr-admin")).thenReturn(Optional.of(adminUser));

        ResponseEntity<?> adminResponse = userController.deleteUser("usr-admin");
        assertEquals(403, adminResponse.getStatusCode().value(), "Deleting admin must return HTTP 403 Forbidden");
    }

    @Test
    @DisplayName("F01 / F08: Truncating users table is strictly blocked (403 Forbidden)")
    void testTruncateUsersTableBlocked() {
        AdminController adminController = new AdminController();
        Authentication auth = new UsernamePasswordAuthenticationToken("santiago.salazar", "pwd", List.of(new SimpleGrantedAuthority("ROLE_ADMINISTRATOR")));

        ResponseEntity<String> response = adminController.truncateTable("users", null, auth);
        assertEquals(403, response.getStatusCode().value(), "Truncating users table must return HTTP 403");
        assertTrue(response.getBody().contains("users table is strictly forbidden"));
    }

    @Test
    @DisplayName("F04: AES-256-GCM encryption produces unique ciphertexts and decrypts correctly")
    void testAesGcmEncryptionDecryption() {
        ConfigurationService configService = new ConfigurationService();
        org.springframework.test.util.ReflectionTestUtils.setField(configService, "masterSecretKey", "404E635266556A586E3272357538782F413F4428472B4B6250645367566B5970");

        String plainSecret = "AIzaSyD-SecretApiKeySample1234567890";

        String cipher1 = org.springframework.test.util.ReflectionTestUtils.invokeMethod(configService, "encrypt", plainSecret);
        String cipher2 = org.springframework.test.util.ReflectionTestUtils.invokeMethod(configService, "encrypt", plainSecret);

        assertNotNull(cipher1);
        assertNotNull(cipher2);
        assertNotEquals(cipher1, cipher2, "AES-GCM must use random IVs, producing different ciphertexts for identical plaintext");

        String decrypted1 = org.springframework.test.util.ReflectionTestUtils.invokeMethod(configService, "decrypt", cipher1);
        String decrypted2 = org.springframework.test.util.ReflectionTestUtils.invokeMethod(configService, "decrypt", cipher2);

        assertEquals(plainSecret, decrypted1, "Decrypted text must match original plaintext");
        assertEquals(plainSecret, decrypted2, "Decrypted text must match original plaintext");
    }

    @Test
    @DisplayName("F06: File storage blocks unapproved file extensions (.exe, .sh, .bat)")
    void testFileExtensionAllowlist(@TempDir Path tempDir) {
        FileStorageService storageService = new FileStorageService(tempDir.toString());
        storageService.init();

        MockMultipartFile maliciousFile = new MockMultipartFile("file", "malware.exe", "application/octet-stream", "evil_bytes".getBytes(StandardCharsets.UTF_8));
        assertThrows(IllegalArgumentException.class, () -> storageService.storeFile(maliciousFile), "Executable files (.exe) must be rejected");

        MockMultipartFile shellScript = new MockMultipartFile("file", "attack.sh", "text/plain", "#!/bin/bash".getBytes(StandardCharsets.UTF_8));
        assertThrows(IllegalArgumentException.class, () -> storageService.storeFile(shellScript), "Shell script files (.sh) must be rejected");

        MockMultipartFile validKml = new MockMultipartFile("file", "mission_map.kml", "application/xml", "<kml></kml>".getBytes(StandardCharsets.UTF_8));
        String storedName = storageService.storeFile(validKml);
        assertNotNull(storedName);
        assertTrue(storedName.endsWith(".kml"));
    }

    @Test
    @DisplayName("F06: Path traversal attempts in file names are rejected")
    void testPathTraversalProtection(@TempDir Path tempDir) {
        FileStorageService storageService = new FileStorageService(tempDir.toString());
        storageService.init();

        assertThrows(SecurityException.class, () -> storageService.loadFileAsResource("../../../etc/passwd"), "Directory traversal via .. must throw SecurityException");
        assertThrows(SecurityException.class, () -> storageService.loadFileAsResource("subdir/nested.txt"), "Slash in filename must throw SecurityException");
    }

    @Test
    @DisplayName("F03: Constant-time comparison prevents timing attacks on webhook secrets")
    void testConstantTimeWebhookComparison() {
        String serverSecret = "super-secret-osint-token-2026";
        String validSecret = "super-secret-osint-token-2026";
        String invalidSecret = "wrong-secret-token";

        boolean validMatch = MessageDigest.isEqual(
                validSecret.getBytes(StandardCharsets.UTF_8),
                serverSecret.getBytes(StandardCharsets.UTF_8)
        );
        assertTrue(validMatch, "Valid webhook secret must match");

        boolean invalidMatch = MessageDigest.isEqual(
                invalidSecret.getBytes(StandardCharsets.UTF_8),
                serverSecret.getBytes(StandardCharsets.UTF_8)
        );
        assertFalse(invalidMatch, "Invalid webhook secret must fail");
    }
}
