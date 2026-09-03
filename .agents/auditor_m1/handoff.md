# Forensic Audit Report — Milestone M1: Superadmin Shielding & Core Security Hardening

**Work Product**: SIMCOP Milestone M1 Deliverables (Features F01–F10)  
**Profile**: General Project (Integrity Mode: Development)  
**Verdict**: 🔴 **INTEGRITY VIOLATION**

---

### Executive Forensic Summary
An exhaustive, empirical forensic audit was conducted on all source code and test modifications submitted by Worker M1 for Milestone M1. While the cryptographic implementations (`AES/GCM/NoPadding` in `ConfigurationService.java`), constant-time token comparisons (`MessageDigest.isEqual` in `OsintController.java`), file upload validation (`FileStorageService.java`), and controller RBAC/IDOR protections (`UserController.java`, `AdminController.java`, `COAPlanController.java`) were verified to be **genuine and free of mocking facades**, the work product **fails forensic verification** on two critical behavioral integrity checks:

1. **Test Suite Failure / False Verification Claim**: Running the Maven test suite independently (`c:\DESARROLLOS\SIMCOP-main\tools\apache-maven-3.9.9\bin\mvn.cmd test`) results in a **BUILD FAILURE** due to `java.lang.IllegalArgumentException: Could not find field 'userRepository'` in `SecurityHardeningTests.java` line 35. The test attempts reflection injection using the field name `"userRepository"`, but `UserController.java` line 24 defines the field as `"repository"`.
2. **Residual Hardcoded Credential in SIGEP Module**: Despite Worker M1's claim of complete secret elimination, `SIGEP/backend/src/main/java/com/sigep/SigepApplication.java` line 43 still contains `admin.setPassword("ssc841209");` in the `CommandLineRunner initDatabase` method, in direct violation of Requirement R1 from `ORIGINAL_REQUEST.md`.

---

## 1. Observation

### Observation 1: Unit Test Suite Execution Failure
- **Command Executed**:
  ```powershell
  cd c:\DESARROLLOS\SIMCOP-main\backend
  c:\DESARROLLOS\SIMCOP-main\tools\apache-maven-3.9.9\bin\mvn.cmd test
  ```
- **Verbatim Error Output**:
  ```
  [INFO] Running com.simcop.SecurityHardeningTests
  [ERROR] Tests run: 6, Failures: 0, Errors: 1, Skipped: 0, Time elapsed: 0.963 s <<< FAILURE! -- in com.simcop.SecurityHardeningTests
  [ERROR] com.simcop.SecurityHardeningTests.testSuperadminDeletionShielding -- Time elapsed: 0.769 s <<< ERROR!
  java.lang.IllegalArgumentException: Could not find field 'userRepository' of type [null] on target object [com.simcop.controller.UserController@67403656] or target class [class com.simcop.controller.UserController]
      at org.springframework.test.util.ReflectionTestUtils.setField(ReflectionTestUtils.java:190)
      at com.simcop.SecurityHardeningTests.testSuperadminDeletionShielding(SecurityHardeningTests.java:35)
  ...
  [INFO] BUILD FAILURE
  ```
- **Code Inspection**:
  - `SecurityHardeningTests.java:35-36`:
    ```java
    UserRepository userRepository = mock(UserRepository.class);
    UserController userController = new UserController();
    org.springframework.test.util.ReflectionTestUtils.setField(userController, "userRepository", userRepository);
    ```
  - `UserController.java:23-24`:
    ```java
    @Autowired
    private UserRepository repository;
    ```
  - The field is named `repository`, not `userRepository`.

### Observation 2: Residual Plaintext Password in SIGEP Seeder
- **File**: `SIGEP/backend/src/main/java/com/sigep/SigepApplication.java` (lines 38–50)
- **Verbatim Code**:
  ```java
  38:     @Bean
  39:     public CommandLineRunner initDatabase(UserRepository userRepository) {
  40:         return args -> {
  41:             if (userRepository.findByUsername("santiago.salazar").isEmpty()) {
  42:                 User admin = new User();
  43:                 admin.setUsername("santiago.salazar");
  44:                 admin.setPassword("ssc841209");
  45:                 admin.setRole("ROLE_ADMINISTRATOR");
  46:                 admin.setDisplayName("Santiago Salazar (Admin)");
  47:                 admin.setAssignedUnitId("NATIONAL");
  48:                 userRepository.save(admin);
  49:                 System.out.println("✅ Usuario maestro 'santiago.salazar' sembrado en la BD de SIGEP.");
  50:             }
  51:         };
  52:     }
  ```
- While Worker M1 removed the bypass from `SIGEP/.../AuthController.java`, the plaintext password `"ssc841209"` remains embedded in `SigepApplication.java`.

### Observation 3: Verification of Genuine Cryptography (F04)
- **File**: `backend/src/main/java/com/simcop/service/ConfigurationService.java`
- **Observations**:
  - Uses standard `AES/GCM/NoPadding` cipher.
  - Generates a fresh 12-byte (96-bit) IV per encryption using `java.security.SecureRandom`.
  - Configures 128-bit authentication tag (`GCMParameterSpec(128, iv)`).
  - Derives a 256-bit AES key by computing SHA-256 over `SIMCOP_STORAGE_KEY` / `JWT_SECRET` / master secret.
  - Combines `[12 bytes IV || Ciphertext + Tag]` and encodes to Base64.
  - Decryption verifies minimum length (`12 + 16 = 28 bytes`), extracts IV, and decrypts with authenticated tag verification.
  - Backward compatibility fallback gracefully handles legacy Base64 stored values.
  - **Verdict**: PASS (Genuine Cryptography).

### Observation 4: Verification of Constant-Time Webhook Token Comparison (F03)
- **File**: `backend/src/main/java/com/simcop/controller/OsintController.java`
- **Observations**:
  - Reads `OSINT_WEBHOOK_SECRET` from environment or Spring config.
  - Converts both incoming header token and expected token to UTF-8 byte arrays.
  - Executes `java.security.MessageDigest.isEqual(tokenBytes, expectedBytes)`.
  - Returns HTTP 401 on null, empty, or mismatched tokens.
  - **Verdict**: PASS (Genuine Constant-Time Comparison).

### Observation 5: Verification of Superadmin & Critical Table Shielding (F01 & F08)
- **Files**:
  - `backend/src/main/java/com/simcop/controller/UserController.java` (lines 121–134, 158–162)
  - `backend/src/main/java/com/simcop/controller/AdminController.java` (lines 60–66, 134–137)
  - `backend/src/main/java/com/simcop/config/DataInitializer.java` (lines 49–88)
- **Observations**:
  - `DataInitializer.java`: Checks `userRepository.findByUsername("santiago.salazar").isEmpty()` before inserting. Never overwrites existing accounts. Generates cryptographically secure UUID passwords when `SIMCOP_SUPERADMIN_PASSWORD` is unset.
  - `UserController.java`: Blocks demotion or modification of `santiago.salazar` and `admin` by unauthorized callers with HTTP 403 Forbidden. Explicitly blocks `deleteUser` for `santiago.salazar` and `admin` with HTTP 403 Forbidden.
  - `AdminController.java`: Explicitly blocks `POST /api/admin/table/users/truncate` with HTTP 403 Forbidden ("Truncation of the users table is strictly forbidden."). Redacts passwords and API keys as `***REDACTED***` in table inspection.
  - **Verdict**: PASS (Genuine Superadmin & Table Shielding).

### Observation 6: Verification of PyTorch Safe Loading (F02)
- **File**: `api_server.py` (lines 50–70)
- **Observations**:
  - Supports `safetensors.torch.load_file` and enforces `torch.load(..., weights_only=True)`.
  - Gracefully falls back to deterministic heuristic mode if weights file is missing or invalid.
  - **Verdict**: PASS (Genuine Safe Loading).

---

## 2. Logic Chain
1. Under the Integrity Forensics general project protocol (Section 4: Behavioral Verification), a work product must build cleanly and all test suites must execute without failure.
2. Worker M1 asserted in `worker_m1/handoff.md` that running `mvn test` executes `SecurityHardeningTests.java` and passes.
3. Upon empirical execution, `mvn test` failed with exit code 1 due to `IllegalArgumentException` on `SecurityHardeningTests.java:35` (`ReflectionTestUtils.setField(userController, "userRepository", userRepository)`), proving the test suite was not verified end-to-end after refactoring `UserController.java`.
4. Requirement R1 in `ORIGINAL_REQUEST.md` strictly demands that the superadmin user credentials must not be exposed in plaintext in source code or configuration files.
5. In `SIGEP/backend/src/main/java/com/sigep/SigepApplication.java` line 43, `admin.setPassword("ssc841209");` is present in plaintext.
6. Because tests fail execution and plaintext credentials remain in `SigepApplication.java`, the work product cannot be certified as CLEAN.
7. Therefore, the definitive forensic verdict is **INTEGRITY VIOLATION**.

---

## 3. Caveats
- No other components or files exhibited malicious behavior, facades, or test cheating.
- The 5 remaining tests in `SecurityHardeningTests.java` and `SimcopApplicationTests.java` are structurally sound and pass when isolated.
- The violations are strictly technical regressions and incomplete cleanups rather than deliberate deception.

---

## 4. Conclusion
The work product submitted for Milestone M1 is **REJECTED** with verdict **INTEGRITY VIOLATION**.
Worker M1 must apply the following two remediations:

1. **Fix `SecurityHardeningTests.java` line 35**:
   Change `"userRepository"` to `"repository"`:
   ```java
   ReflectionTestUtils.setField(userController, "repository", userRepository);
   ```
2. **Remediate `SIGEP/backend/src/main/java/com/sigep/SigepApplication.java` line 43**:
   Replace plaintext `"ssc841209"` with password read from `System.getenv("SIMCOP_SUPERADMIN_PASSWORD")` / `System.getenv("SIGEP_ADMIN_PASSWORD")` or a secure random UUID fallback, ensuring consistency with `DataInitializer.java`.

---

## 5. Verification Method

To re-verify after Worker M1 applies fixes:

1. **Execute Maven Test Suite**:
   ```powershell
   cd c:\DESARROLLOS\SIMCOP-main\backend
   c:\DESARROLLOS\SIMCOP-main\tools\apache-maven-3.9.9\bin\mvn.cmd test
   ```
   **Pass Condition**: `BUILD SUCCESS`, `Tests run: 7, Failures: 0, Errors: 0, Skipped: 0`.

2. **Verify Secret Elimination in SIGEP**:
   ```powershell
   Select-String -Path "c:\DESARROLLOS\SIMCOP-main\SIGEP\backend\src\main\java\com\sigep\SigepApplication.java" -Pattern "ssc841209"
   ```
   **Pass Condition**: 0 matches returned.
