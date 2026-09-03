# HANDOFF REPORT — SURVEY EXPLORER 1 (SECURITY & SUPERADMIN HARDENING)

**Date**: 2026-09-02T02:10:00Z  
**From**: Survey Explorer 1 (`.agents/explorer_survey_1`)  
**To**: Orchestrator (`2492d16c-097e-451b-8336-1c33711fd82d`)  
**Task Scope**: Security Vulnerabilities & Superadmin Hardening Mapping (R1, SEC-01, SEC-03, SEC-04, SEC-06, SEC-07, SEC-08, SEC-09, SEC-10, SEC-11)

---

## 1. OBSERVATION

The codebase investigation directly identified the following exact locations, code snippets, and configuration parameters:

1. **R1 & Default Superadmin Exposure**:
   - `backend/src/main/java/com/simcop/config/DataInitializer.java` (lines 25, 50-79): `@Value("${app.admin.default-password:change-me-immediately}")`. Initializer preserves existing users with `userRepository.findByUsername("santiago.salazar").isEmpty()`, but falls back to `change-me-immediately` if `SIMCOP_SUPERADMIN_PASSWORD` is absent.
   - `backend/src/main/java/com/simcop/controller/UserController.java` (lines 110-139): `updateUser` (`PUT /{id}`) and `deleteUser` (`DELETE /{id}`) are guarded only by `@PreAuthorize("hasRole('ADMINISTRATOR')")` and have no safeguard preventing the modification, role demotion, or deletion of `santiago.salazar` or `admin`.
   - `SIGEP/backend/src/main/java/com/sigep/controller/AuthController.java` (line 44): Hardcoded emergency backdoor `else if ("santiago.salazar".equals(username) && "ssc841209".equals(password))` granting `ROLE_ADMINISTRATOR`.
   - `scripts/ensure_admin.js` (lines 11-43): Script containing hardcoded credentials.

2. **SEC-01 (PyTorch Model Deserialization & RCE)**:
   - `api_server.py` (lines 43-58): `torch.load(MODEL_PATH, map_location=self.device, weights_only=True)`.
   - `simcop_nlp_weights_quantized_int8.pth` (295.98 MiB): Composed of 100% null bytes (`0x00`), causing `UnpicklingError` caught in lines 53-55 and falling back to heuristic mock templates.

3. **SEC-03 (Hardcoded Secrets & Tokens)**:
   - `backend/src/main/java/com/simcop/controller/OsintController.java` (lines 73-86): `@Value("${app.osint.webhook-secret:simcop-osint-secret-2026}")` and `!token.equals(expectedToken)` comparison.
   - `backend/src/main/java/com/simcop/service/WeatherService.java` (line 48): `body.put("key", "yyPzfp5tCyd3PkkJgykYf7tffTSYVUCy");` hardcoded Windy API key.
   - `docker-compose.yml` (lines 11, 50): Default database password `password`.

4. **SEC-04 (JWT Secret Fallback & Storage Encryption)**:
   - `backend/src/main/resources/application.properties` (line 28): `jwt.secret=${JWT_SECRET:404E635266556A586E3272357538782F413F4428472B4B6250645367566B5970}`.
   - `backend/src/main/java/com/simcop/service/ConfigurationService.java` (lines 198-208): `encrypt()` and `decrypt()` perform simple Base64 encoding/decoding on database configurations.
   - `backend/src/main/java/com/simcop/controller/ConfigurationController.java` (lines 40-50): `GET /api/config/gemini-api-key` exposes raw API key to non-admin command roles.

5. **SEC-06 (Authentication Bypasses & Open Relays)**:
   - `backend/src/main/java/com/simcop/controller/MilitaryUnitController.java` (lines 33-37): Manual extraction via `@RequestHeader(value = "Authorization", required = false)`.
   - `backend/src/main/java/com/simcop/config/SecurityConfig.java` (lines 46-57): `.requestMatchers("/api/telegram/test").permitAll()`, `.requestMatchers("/api/weather/**").permitAll()`.
   - `SIGEP/backend/src/main/java/com/sigep/security/SecurityConfig.java` (lines 33-34): `.requestMatchers(new AntPathRequestMatcher("/h2-console/**")).permitAll()`, `/api/simcop/**`.

6. **SEC-07 (Path Traversal & File Upload XSS)**:
   - `backend/src/main/java/com/simcop/service/FileStorageService.java` (lines 38-68): No extension allowlist; accepts any uploaded extension.
   - `backend/src/main/java/com/simcop/controller/FileController.java` (lines 59-63): Serves files with `Content-Disposition: inline`, allowing stored script execution (XSS) if SVG/HTML files are uploaded.

7. **SEC-08 (BOLA / IDOR Across REST Endpoints)**:
   - `backend/src/main/java/com/simcop/controller/COAPlanController.java` (lines 41-58): Any authenticated user can mutate or delete any other commander's COA plan via `PUT /{id}`, `DELETE /{id}`, `DELETE /{id}/hard`.
   - `backend/src/main/java/com/simcop/controller/LogisticsRequestController.java` (lines 41-52): `PUT /api/logistics/{id}` allows any user to modify requests and supply arbitrary `fulfilledByUserId`.
   - `backend/src/main/java/com/simcop/controller/OperationalGraphicController.java` (lines 33-37): `DELETE /api/graphics/{id}` lacks ownership validation.
   - `backend/src/main/java/com/simcop/controller/BMAController.java` (lines 56-66): `POST /api/bma/logistics/request/{unitId}` has no role validation.
   - `backend/src/main/java/com/simcop/controller/ForwardObserverController.java` (lines 29-53) & `SpecialtyCatalogController.java` (lines 34-70): Missing `@PreAuthorize`.
   - `backend/src/main/java/com/simcop/controller/UnitHistoryEventController.java` (lines 29-40): Public `POST /api/history` allows arbitrary injection into the audit history.

8. **SEC-09 (Data Masking & Table Truncation)**:
   - `backend/src/main/java/com/simcop/controller/AdminController.java` (lines 60-94, 101-146): Dynamic `SELECT * FROM " + tableName` lacks a table allowlist. `truncateTable` allows destroying the `users` table. `app_configuration` values are not masked.

9. **SEC-10 (Secure Authenticated Context Extraction)**:
   - `services/configService.ts` (lines 74, 172, 213, 251): Sends `{ username: 'admin' }` in JSON body.
   - Controllers take user IDs from client payloads rather than `SecurityContextHolder.getContext().getAuthentication().getName()`.

10. **SEC-11 (Secure API Key Transmission & OmniRoute Integration)**:
    - `backend/src/main/java/com/simcop/service/GeminiService.java` (lines 140-145): Uses `x-goog-api-key` header.
    - `utils/geminiService.ts` (lines 225-260): Calls OpenAI/OmniRoute endpoints with `Authorization: Bearer <API_KEY>`.
    - `components/SettingsView.tsx`: Needs full provider selection for OmniRoute (`https://api.omniroute.ai/v1`, models `omni-default`, `deepseek-r1`, etc.).

---

## 2. LOGIC CHAIN

1. **R1**: Because `DataInitializer.java` does not overwrite existing users if `findByUsername` returns a user, startup persistence is partially preserved. However, because `UserController` exposes `deleteUser` and `updateUser` without checking for protected superadmin accounts (`santiago.salazar`, `admin`), any user with `ADMINISTRATOR` privileges can delete or demote the superadmin. Furthermore, `AdminController.truncateTable` can delete all users, and `SIGEP/.../AuthController` contains a hardcoded backdoor password. Therefore, superadmin immutability requires code-level blocking in `UserController`, table truncation prevention in `AdminController`, and removing the backdoor in SIGEP.
2. **SEC-01**: Because PyTorch's default `.pth` format uses Pickle, it represents an inherent RCE risk if untrusted models are loaded without `weights_only=True`. Furthermore, since the current `.pth` file contains only null bytes, migrating to Safetensors or GGUF ensures genuine format safety and predictable execution.
3. **SEC-03 & SEC-04**: Because default secrets are embedded as fallbacks in annotations, properties, and compose files, anyone with repo access can predict webhook tokens, forge JWTs, or access Windy APIs. Additionally, Base64 is encoding rather than encryption, leaving database-stored credentials exposed. Replacing Base64 with AES-256-GCM and requiring environment variables eliminates credential exposure.
4. **SEC-06 & SEC-10**: Because controllers manually parse headers or trust client-provided usernames in JSON payloads, callers can spoof identities or bypass authentication. Enforcing Spring Security's `Authentication` object from `SecurityContextHolder` ensures trustworthy user context.
5. **SEC-07 & SEC-09**: Because uploaded files are served inline without extension filtering, attackers could execute XSS. Because table inspection lacks an allowlist, internal database tables could be dumped. Restricting uploads to document/image types, forcing attachment headers, and enforcing a table allowlist completely mitigates these risks.
6. **SEC-08**: Because CRUD endpoints for plans, graphics, and observers do not check resource ownership, any authenticated user can alter another unit's data. Enforcing `@PreAuthorize` and creator checks resolves BOLA/IDOR across all controllers.
7. **SEC-11**: Because OmniRoute requires OpenAI-compatible Bearer authentication, aligning `SettingsView.tsx`, `configService.ts`, and `geminiService.ts` with `Authorization: Bearer <API_KEY>` ensures secure transmission without URL query param leaks.

---

## 3. CAVEATS

- Investigation was performed in read-only mode across all repository source files.
- The external live OmniRoute endpoint (`https://api.omniroute.ai/v1`) was not pinged with real network packets during survey mode to maintain air-gap hygiene.
- SIGEP database is an embedded H2 instance, whereas SIMCOP supports both H2 and MySQL.

---

## 4. CONCLUSION

All 10 security objectives (R1, SEC-01, SEC-03, SEC-04, SEC-06, SEC-07, SEC-08, SEC-09, SEC-10, SEC-11) have been mapped to exact file paths, line numbers, and concrete remediation specifications. The system can be fully hardened by applying targeted changes to Spring Boot controllers/services, frontend API utilities, and configuration files without breaking tactical functionality. Detailed documentation is stored in `.agents/explorer_survey_1/analysis.md`.

---

## 5. VERIFICATION METHOD

To verify the findings and subsequent remediations:

1. **Static Analysis & Secret Grep**:
   - `grep -rn "simcop-osint-secret-2026" .` (Must return 0 in production code).
   - `grep -rn "yyPzfp5tCyd3PkkJgykYf7tffTSYVUCy" .` (Must return 0).
   - `grep -rn "ssc841209" .` (Must return 0).
2. **Superadmin Deletion & Mutation Test**:
   - Issue `DELETE /api/users/{santiago_salazar_id}` with admin token: Verify `403 Forbidden`.
   - Issue `POST /api/admin/table/users/truncate`: Verify `403 Forbidden` / Blocked.
3. **BOLA/IDOR Permission Test**:
   - Issue `DELETE /api/coa-plans/{other_user_plan_id}` with non-owner token: Verify `403 Forbidden`.
4. **File Upload Verification**:
   - Attempt uploading `.html` or `.svg` file to `POST /api/files/upload`: Verify `400 Bad Request`.
   - Download file from `GET /api/files/{fileName}`: Verify `Content-Disposition: attachment`.
5. **Frontend Build Verification**:
   - Run `npm run build` in root directory: Verify 0 compilation errors.
