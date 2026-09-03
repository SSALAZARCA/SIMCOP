## 2026-09-01T21:11:02-05:00

You are Worker M1 (Superadmin Shielding & Core Security Hardening).
Your working directory is `c:/DESARROLLOS/SIMCOP-main/.agents/worker_m1/`.
You MUST read `c:/DESARROLLOS/SIMCOP-main/.agents/ORIGINAL_REQUEST.md`, `c:/DESARROLLOS/SIMCOP-main/PROJECT.md`, `c:/DESARROLLOS/SIMCOP-main/INFORME_ANALISIS_SIMCOP.md`, and `c:/DESARROLLOS/SIMCOP-main/.agents/explorer_survey_1/handoff.md`.

### Mandatory Integrity Warning
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

### Your Exclusive Scope and File Ownership:
Implement the complete remediations for features F01 through F10:
1. **F01 (R1: Superadmin Shielding & Immutability)**:
   - In `DataInitializer.java`: Initialize `santiago.salazar` and `admin` using `SIMCOP_SUPERADMIN_PASSWORD` (or secure generated value), preserve existing accounts, never overwrite on startup.
   - In `UserController.java`: In `updateUser` and `deleteUser`, strictly block modifying, deleting, or demoting `santiago.salazar` and `admin` (return 403 Forbidden).
   - In `AdminController.java`: Block `truncateTable` if table name is `users` (return 403 Forbidden).
   - In `SIGEP/.../AuthController.java`: Remove backdoor credentials (`ssc841209`).
   - In `scripts/ensure_admin.js`: Sanitize hardcoded credentials, use environment variables.
2. **F02 (SEC-01: PyTorch Safe Loading & RCE Mitigation)**:
   - In `api_server.py`: Ensure `torch.load` strictly uses `weights_only=True` or safetensors format; handle null/corrupt model gracefully with robust fallback.
3. **F03 (SEC-03: Secrets & Webhook Protection)**:
   - In `OsintController.java`: Validate webhook secret with constant-time comparison (`MessageDigest.isEqual`) using `OSINT_WEBHOOK_SECRET` env var.
   - In `WeatherService.java`: Remove hardcoded Windy API key, read from configuration/env.
4. **F04 (SEC-04: JWT Secret & AES-256-GCM Storage Encryption)**:
   - In `application.properties`: Ensure JWT secret requires `JWT_SECRET` environment variable with secure fallback.
   - In `ConfigurationService.java`: Replace Base64 pseudo-encryption in `encrypt()` / `decrypt()` with real AES-256-GCM (with random IV prepended).
   - In `ConfigurationController.java`: Restrict `GET /api/config/gemini-api-key` to authorized roles or masked output.
5. **F05 (SEC-06: Auth Bypass & Open Relay Elimination)**:
   - In `MilitaryUnitController.java`: Remove manual Authorization header parsing/bypass; rely exclusively on Spring Security context.
   - In `SecurityConfig.java` (SIMCOP and SIGEP): Close unauthenticated relays (`/api/telegram/test`, `/api/weather/**`, H2 console in production).
6. **F06 (SEC-07: Path Traversal & File Upload Security)**:
   - In `FileStorageService.java`: Enforce strict file extension allowlist (images, pdfs, kml/kmz, json) and sanitize filenames.
   - In `FileController.java`: Set `Content-Disposition: attachment; filename=...` and disable inline execution for uploaded files.
7. **F07 (SEC-08: BOLA / IDOR Protection)**:
   - Enforce creator/ownership checks and `@PreAuthorize` across `COAPlanController.java`, `LogisticsRequestController.java`, `OperationalGraphicController.java`, `BMAController.java`, `ForwardObserverController.java`, `SpecialtyCatalogController.java`, `UnitHistoryEventController.java`.
8. **F08 (SEC-09: Admin Panel Data Masking & Table Allowlist)**:
   - In `AdminController.java`: Implement strict allowlist of inspectable table names; mask sensitive fields (`app_configuration`, passwords, tokens) in query results.
9. **F09 (SEC-10: Secure Authenticated User Context)**:
   - Extract user identity exclusively from `SecurityContextHolder.getContext().getAuthentication().getName()`.
   - In `services/configService.ts`: Remove hardcoded `{ username: 'admin' }` client payloads.
10. **F10 (SEC-11: Secure API Key Transmission)**:
    - Ensure all API keys are passed in `Authorization: Bearer` headers or secure backend configuration.
