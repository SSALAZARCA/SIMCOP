# Independent Review & Adversarial Challenge Report — Milestone M1
**Reviewer**: Reviewer 2 (Reviewer & Adversarial Critic)
**Target Milestone**: M1 (Superadmin Shielding & Core Security Hardening — F01 to F10)
**Verdict**: **REQUEST_CHANGES**

---

## 1. Observation

### 1.1 Test Suite Execution Failures
1. **Maven Backend Test Suite (`mvn test`)**:
   - **Command executed**: `& "c:\DESARROLLOS\SIMCOP-main\tools\apache-maven-3.9.9\bin\mvn.cmd" test` in `backend/`
   - **Result**: `BUILD FAILURE` (Exit Code 1)
   - **Verbatim Error**:
     ```text
     [ERROR] Errors: 
     [ERROR]   SecurityHardeningTests.testSuperadminDeletionShielding:35 » IllegalArgument Could not find field 'userRepository' of type [null] on target object [com.simcop.controller.UserController@20095ab4] or target class [class com.simcop.controller.UserController]
     [INFO] 
     [ERROR] Tests run: 7, Failures: 0, Errors: 1, Skipped: 0
     ```
   - **Root Cause**: In `backend/src/test/java/com/simcop/SecurityHardeningTests.java:35`, `ReflectionTestUtils.setField(userController, "userRepository", userRepository)` searches for a field named `"userRepository"`. However, in `backend/src/main/java/com/simcop/controller/UserController.java:23`, the field is defined as:
     ```java
     @Autowired
     private UserRepository repository;
     ```

2. **JavaScript E2E Test Suite**:
   - **Command executed**: `node tests\e2e\run_all_e2e_tests.js`
   - **Result**: 243 passed, 4 failed.
   - **Analysis**: All M1-scoped tests (F01 to F10 in Tier 1 and Tier 2) passed in the E2E suite. The 4 failures pertain to downstream milestones M2/M4/M5 (e.g. `f12_bnd_omniroute_upstream.test.js: ReferenceError: beforeAll is not defined`, `F11-BND-T1`, `F19` TS types, `Tier 4 Scenario 2`).

### 1.2 Remaining Hardcoded Credentials & Secrets
A project-wide search (`grep_search`) identified several locations where default credentials and tokens remain in source code:
1. **`SIGEP/backend/src/main/java/com/sigep/SigepApplication.java:43`**:
   ```java
   if (userRepository.findByUsername("santiago.salazar").isEmpty()) {
       User admin = new User();
       admin.setUsername("santiago.salazar");
       admin.setPassword("ssc841209");
       admin.setRole("ROLE_ADMINISTRATOR");
       admin.setDisplayName("Santiago Salazar (Admin)");
       admin.setAssignedUnitId("NATIONAL");
       userRepository.save(admin);
       System.out.println("✅ Usuario maestro 'santiago.salazar' sembrado en la BD de SIGEP.");
   }
   ```
   Plain text password `"ssc841209"` is hardcoded in the database seeder for SIGEP.

2. **`hooks/useSimulatedData.ts:148`**:
   ```typescript
   const createDefaultAdminUser = (): User => {
     return {
       id: 'default-admin-001', // Fixed ID for consistency
       username: 'santiago.salazar',
       displayName: 'Santiago Salazar',
       hashedPassword: hashPassword('ssc841209'),
       role: UserRole.ADMINISTRATOR,
       permissions: Object.values(ViewType),
       assignedUnitId: null,
     };
   };
   ```
   Hardcoded plaintext string `'ssc841209'` is used in the simulation hook.

3. **`components/SettingsView.tsx:666, 670`**:
   ```tsx
   <input 
       type="text" 
       readOnly 
       value="simcop-osint-secret-2026" 
       style={{ flex: 1, backgroundColor: '#0f172a', ... }}
   />
   <button 
       onClick={() => navigator.clipboard.writeText('simcop-osint-secret-2026')}
   ...
   ```
   The obsolete webhook secret `"simcop-osint-secret-2026"` is still hardcoded in the UI input value and clipboard handler.

### 1.3 Verified Security Hardening Implementations
The following core security implementations were verified to be genuine and robust:
- **F01 (Superadmin Shielding & Immutability)**: `UserController.java` (lines 121-165) strictly blocks deleting superadmin accounts (`santiago.salazar` / `admin`), blocks role demotion, and blocks unauthorized profile modification by non-superadmin users. `DataInitializer.java` preserves existing accounts and supports environment variables `SIMCOP_SUPERADMIN_PASSWORD` / `SIMCOP_ADMIN_PASSWORD` or random UUID generation.
- **F02 (SEC-01 PyTorch Safe Loading)**: `api_server.py` (lines 53-65) enforces `weights_only=True` in `torch.load()` and supports `safetensors.torch.load_file`, falling back cleanly to deterministic heuristic mode on load failure.
- **F03 (SEC-03 Webhook Protection & Secrets)**: `OsintController.java` (lines 80-104) uses `MessageDigest.isEqual` for constant-time token comparison against `OSINT_WEBHOOK_SECRET`. `WeatherService.java` removed the hardcoded Windy API key.
- **F04 (SEC-04 AES-256-GCM Storage Encryption)**: `ConfigurationService.java` (lines 201-273) derives a 256-bit AES key via SHA-256, generates a random 12-byte IV per encryption, uses a 128-bit authentication tag, and supports backward-compatible decryption.
- **F05 (SEC-06 Auth Bypass & Relay Elimination)**: `MilitaryUnitController.java` (lines 38-59) extracts the user principal strictly from `SecurityContextHolder.getContext().getAuthentication()`. `SecurityConfig.java` eliminated unauthenticated relays.
- **F06 (SEC-07 File Storage & Path Traversal)**: `FileStorageService.java` (lines 37-82) enforces an extension allowlist, cleans paths, rejects directory traversal sequences (`..`), and `FileController.java` adds `Content-Disposition: attachment` and `nosniff`.
- **F07 & F08 (SEC-08 BOLA/IDOR & Admin Protection)**: Tactical controllers (`COAPlanController`, `OperationalGraphicController`, `LogisticsRequestController`, etc.) enforce ownership and `@PreAuthorize` guards. `AdminController.java` restricts queries via `ALLOWED_TABLES` allowlist, blocks `users` table truncation with HTTP 403, and redacts sensitive columns.
- **F09 & F10 (SEC-10/11 User Context & Key Transmission)**: `configService.ts` and `SettingsView.tsx` removed client-injected `{ username: 'admin' }` payloads, and keys are protected behind admin-only endpoints.

---

## 2. Logic Chain

1. **Premise 1 (Self-Verification & Test Integrity)**:
   A core requirement of any security milestone is that all unit tests compile, execute, and pass without runtime reflection errors or broken assertions.
   - Observation: `SecurityHardeningTests.java` failed with `IllegalArgumentException` on line 35.
   - Inference: The unit test suite in `backend/` does not pass, preventing automated regression detection and failing acceptance criteria.

2. **Premise 2 (Zero Hardcoded Plaintext Secrets)**:
   Requirement R1 and Acceptance Criteria mandate: *"Ninguna contraseña está quemada en texto claro en el código fuente."*
   - Observation: Plaintext passwords remain in `SigepApplication.java:43` (`admin.setPassword("ssc841209")`), `useSimulatedData.ts:148`, and hardcoded default token in `SettingsView.tsx:666, 670`.
   - Inference: The secret sanitation is incomplete and does not meet the strict zero-secret requirement.

3. **Premise 3 (Core Logic Quality)**:
   The core implementations of F01-F10 (AES-GCM encryption, superadmin protection in `UserController`, constant-time webhook checks, PyTorch safe loader, and admin allowlists) are structurally sound, genuine, and well-designed.

4. **Conclusion**:
   Because of the broken unit test suite and the residual hardcoded credentials in SIGEP and frontend files, changes must be requested before M1 can be certified.

---

## 3. Caveats

- Downstream test failures in `node tests/e2e/run_all_e2e_tests.js` related to OmniRoute (F11/F12), TypeScript types (F19), and MRSI casing (Tier 4 Scenario 2) belong to Milestones M2, M4, and M5 and are not blocking M1 directly.
- The SIGEP module is a secondary interoperability backend; however, the request explicitly requires sanitizing SIGEP credentials and setup scripts.

---

## 4. Conclusion & Required Remediations

**Verdict**: **`REQUEST_CHANGES`**

### Required Action Items for Worker M1:
1. **Fix `backend/src/test/java/com/simcop/SecurityHardeningTests.java` (Line 35)**:
   - Change field name from `"userRepository"` to `"repository"`:
     ```java
     org.springframework.test.util.ReflectionTestUtils.setField(userController, "repository", userRepository);
     ```
   - Re-run and verify `tools/apache-maven-3.9.9/bin/mvn.cmd test` passes with 0 failures and 0 errors.

2. **Sanitize `SIGEP/backend/src/main/java/com/sigep/SigepApplication.java` (Line 43)**:
   - Remove hardcoded `"ssc841209"`.
   - Retrieve password from `System.getenv("SIMCOP_SUPERADMIN_PASSWORD")` / `System.getenv("SIGEP_ADMIN_PASSWORD")` or generate a random secure string.

3. **Sanitize `hooks/useSimulatedData.ts` (Line 148)**:
   - Replace hardcoded `'ssc841209'` with a generic/simulated placeholder or random hash.

4. **Sanitize `components/SettingsView.tsx` (Lines 666, 670)**:
   - Remove hardcoded `"simcop-osint-secret-2026"`. Display a placeholder (e.g., `Configurado vía OSINT_WEBHOOK_SECRET`) or make it a secure configurable field.

---

## 5. Verification Method

To independently verify after fixes are applied:

1. **Run Maven Backend Unit Tests**:
   ```powershell
   cd c:\DESARROLLOS\SIMCOP-main\backend
   & "..\tools\apache-maven-3.9.9\bin\mvn.cmd" test
   ```
   *Expected*: `Tests run: 7, Failures: 0, Errors: 0, Skipped: 0` and `BUILD SUCCESS`.

2. **Verify Absence of Hardcoded Secrets**:
   ```powershell
   grep -rn "ssc841209" SIGEP/ hooks/ backend/
   grep -rn "yyPzfp5tCyd3PkkJgykYf7tffTSYVUCy" backend/
   grep -rn "simcop-osint-secret-2026" components/
   ```
   *Expected*: 0 matches in active implementation files.
