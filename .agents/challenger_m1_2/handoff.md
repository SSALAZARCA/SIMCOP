# Adversarial Challenge Report — Challenger M1_2 (Milestone M1)

**Verdict**: ❌ **REJECT (Requires Quick Remediation)**

---

## 1. Observation

During adversarial review, security analysis, and empirical test execution of Milestone M1 (Security Hardening & Superadmin Shielding), the following observations were recorded:

### A. BOLA / IDOR Verification
- **`COAPlanController.java`**:
  - Class-level `@PreAuthorize("isAuthenticated()")` is present.
  - `POST /api/coa-plans`: Forces `plan.setCreatedByUserId(auth.getName())` from `SecurityContextHolder`.
  - `PUT /api/coa-plans/{id}`: Loads existing record from database, checks `isAdmin` (`ROLE_ADMINISTRATOR` or `ROLE_COMANDANTE_EJERCITO`) or `isOwner` (`createdByUserId.equalsIgnoreCase(auth.getName())`). If unauthorized, returns HTTP 403 Forbidden. Enforces `plan.setCreatedByUserId(existing.getCreatedByUserId())` to prevent tenant/creator tampering.
  - `DELETE /api/coa-plans/{id}`: Checks `isAdmin` or `isOwner` before calling `softDelete(id)`, returning HTTP 403 otherwise.
  - `DELETE /api/coa-plans/{id}/hard`: Strictly restricted to `ROLE_ADMINISTRATOR`.
- **`LogisticsRequestController.java`**:
  - Class-level `@PreAuthorize("isAuthenticated()")` is present.
  - `POST` and `PUT` endpoints are protected with `@PreAuthorize("hasAnyRole('ADMINISTRATOR', 'OFICIAL_LOGISTICA', 'COMANDANTE_EJERCITO', 'COMANDANTE_DIVISION', 'COMANDANTE_BRIGADA', 'COMANDANTE_BATALLON', 'COMANDANTE_COMPANIA', 'COMANDANTE_PELOTON')")`.
  - `PUT /api/logistics/{id}`: Securely overrides `request.setFulfilledByUserId(currentUsername)` using `SecurityContextHolder.getContext().getAuthentication().getName()`, preventing client spoofing of fulfillment identity.
- **`OperationalGraphicController.java`**:
  - Class-level `@PreAuthorize("isAuthenticated()")` is present.
  - `POST /api/graphics`: Sets `graphic.setCreatedByUserId(auth.getName())` from `SecurityContextHolder`.
  - `DELETE /api/graphics/{id}`: Verifies `isAdmin` or `isOwner` before invoking `softDelete(id)`. Returns HTTP 403 if unauthorized.
- **`BMAController.java`**:
  - Class-level `@PreAuthorize("isAuthenticated()")` is present.
  - `POST /api/bma/logistics/request/{unitId}`: Restricts resupply trigger to authorized roles (`ADMINISTRATOR`, `OFICIAL_LOGISTICA`, `COMANDANTE_*`).

### B. Unauthenticated Open Relays & Endpoints
- **`SecurityConfig.java`**:
  - Permitted endpoints without JWT are strictly limited to: `OPTIONS /**`, `POST /api/users/login`, `/api/health/**`, `POST /api/users/register`, `POST /api/osint/webhook`, `/error`.
  - `/api/weather/**`, `/api/telegram/test`, `/h2-console/**`, and `/api/simcop/**` have been removed from `permitAll()` and now require JWT authentication under `/api/**`.
- **`WeatherService.java`**:
  - Hardcoded Windy API key (`yyPzfp5tCyd3PkkJgykYf7tffTSYVUCy`) is completely eliminated. Key is injected via `@Value("${app.weather.windy-api-key:${WINDY_API_KEY:}}")`.
- **`OsintController.java`**:
  - Removed default fallback secret (`simcop-osint-secret-2026`). Token verification uses constant-time byte comparison (`java.security.MessageDigest.isEqual`) against `OSINT_WEBHOOK_SECRET`.

### C. Residual Credentials & Vulnerabilities
1. **Maven Unit Test Failure**:
   - Running `c:/DESARROLLOS/SIMCOP-main/tools/apache-maven-3.9.9/bin/mvn.cmd test` in `backend/` failed with error:
     ```
     [ERROR] Errors: 
     [ERROR]   SecurityHardeningTests.testSuperadminDeletionShielding:35 » IllegalArgument Could not find field 'userRepository' of type [null] on target object [com.simcop.controller.UserController@7a2e0858] or target class [class com.simcop.controller.UserController]
     ```
   - In `backend/src/main/java/com/simcop/controller/UserController.java:23`, the field is named `repository` (`private UserRepository repository;`), but `SecurityHardeningTests.java:35` attempts reflection injection into `"userRepository"`.
2. **Residual Hardcoded Password in SIGEP**:
   - `SIGEP/backend/src/main/java/com/sigep/SigepApplication.java:43`:
     ```java
     admin.setPassword("ssc841209");
     ```
     The plain text password `ssc841209` remains in the SIGEP seed runner.
3. **Residual Token in Frontend Settings UI**:
   - `components/SettingsView.tsx:666` and `line 670`:
     ```tsx
     value="simcop-osint-secret-2026"
     onClick={() => navigator.clipboard.writeText('simcop-osint-secret-2026')}
     ```
     Hardcodes the obsolete sample token string in the UI input and copy button.
4. **Client-Side Simulation Fallback**:
   - `hooks/useSimulatedData.ts:148`:
     ```ts
     hashedPassword: hashPassword('ssc841209')
     ```

### D. E2E Test Suite Execution
- Running `node tests/e2e/runner.js`:
  - **Total Tests Executed**: 247
  - **Passed**: 243
  - **M1 Features (F01–F10 Tier 1 & Tier 2 Boundary Tests)**: 100/100 Passed (100%).
  - **Failures**: 4 failures in future planned milestones (M2 F11/F12, M4 F19, Tier 4 CFF casing).

---

## 2. Logic Chain

1. **BOLA / IDOR Verification**:
   - `COAPlanController`, `LogisticsRequestController`, `OperationalGraphicController`, and `BMAController` all implement proper authorization barriers (`@PreAuthorize`), authenticated context extraction, and creator-locking mechanisms to prevent privilege escalation and horizontal data tampering.
2. **Open Relays Verification**:
   - All legacy open relays (`/api/telegram/test`, `/api/weather/**`, `/h2-console/**`, `/api/simcop/**`) are verified closed and protected behind stateless JWT authentication filters.
3. **Superadmin Shielding Verification**:
   - Superadmin immutability in `UserController.java` blocks deletion and demotion with HTTP 403 Forbidden.
   - `AdminController.java` blocks truncation of `users` table with HTTP 403 Forbidden.
   - `DataInitializer.java` preserves existing accounts without overwriting passwords on boot.
4. **Why REJECT**:
   - Under the Empirical Challenger standard, tests must pass cleanly. The unit test suite in `backend/` fails due to the field name mismatch in `SecurityHardeningTests.java` (`userRepository` vs `repository`).
   - Residual plain text credentials remain in `SIGEP/backend/src/main/java/com/sigep/SigepApplication.java:43` (`ssc841209`) and `components/SettingsView.tsx:666` (`simcop-osint-secret-2026`).

---

## 3. Caveats

- The 4 failures in `node tests/e2e/runner.js` belong to milestones M2 (OmniRoute integration) and M4 (TypeScript build fixes), not M1.
- The core security logic in M1 is robust and well-designed; the rejection is driven by the failing unit test execution and residual credential cleanup.

---

## 4. Conclusion & Required Actions

**VERDICT**: ❌ **REJECT**

To achieve approval, the worker must apply the following remediations:
1. **Fix `SecurityHardeningTests.java`**:
   - In `backend/src/test/java/com/simcop/SecurityHardeningTests.java:35`, change:
     ```java
     org.springframework.test.util.ReflectionTestUtils.setField(userController, "userRepository", userRepository);
     ```
     to:
     ```java
     org.springframework.test.util.ReflectionTestUtils.setField(userController, "repository", userRepository);
     ```
2. **Sanitize `SigepApplication.java`**:
   - In `SIGEP/backend/src/main/java/com/sigep/SigepApplication.java:43`, replace `"ssc841209"` with a password resolved from environment variable `SIGEP_ADMIN_PASSWORD` or a secure random generator.
3. **Clean `SettingsView.tsx`**:
   - In `components/SettingsView.tsx:666-670`, replace `"simcop-osint-secret-2026"` with a generic placeholder or dynamic state representing the configured webhook secret.

---

## 5. Verification Method

1. **Run Maven Backend Unit Tests**:
   ```powershell
   c:/DESARROLLOS/SIMCOP-main/tools/apache-maven-3.9.9/bin/mvn.cmd test -f c:/DESARROLLOS/SIMCOP-main/backend/pom.xml
   ```
   *Expected*: `BUILD SUCCESS`, 7 tests run, 0 failures, 0 errors.

2. **Verify Residual Credential Elimination**:
   ```powershell
   # Search for plain text password in SIGEP
   grep -rn "ssc841209" SIGEP/backend/
   # Search for old OSINT secret in SettingsView
   grep -rn "simcop-osint-secret-2026" components/SettingsView.tsx
   ```
   *Expected*: 0 occurrences in application source code.
