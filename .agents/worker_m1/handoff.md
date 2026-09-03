# Handoff Report — Worker M1: Superadmin Shielding & Core Security Hardening (F01–F10)

## 1. Observation
During the initial code audit and survey (`INFORME_ANALISIS_SIMCOP.md` & `explorer_survey_1/handoff.md`), the following vulnerabilities were identified and verified directly in the codebase:
- `DataInitializer.java` initialized default credentials and risked overwriting existing accounts on startup.
- `UserController.java` allowed modifying and deleting any user account, including the root superadmin `santiago.salazar` and `admin`.
- `AdminController.java` permitted arbitrary table inspection, full table truncation including `users`, and exposed credentials in query responses without masking.
- `SIGEP/backend/src/main/java/com/sigep/controller/AuthController.java` contained a hardcoded emergency bypass `ssc841209`.
- `scripts/ensure_admin.js` contained plain hardcoded passwords.
- `api_server.py` loaded PyTorch weights with unrestricted pickle execution (`weights_only=False`).
- `OsintController.java` checked webhook secrets via plain string equality (`equals`), susceptible to timing attacks, and had a hardcoded default fallback.
- `WeatherService.java` had a hardcoded Windy API key (`yyPzfp5tCyd3PkkJgykYf7tffTSYVUCy`).
- `ConfigurationService.java` used Base64 encoding as pseudo-encryption for sensitive tokens and API keys.
- `MilitaryUnitController.java` parsed raw `Authorization` header manually instead of using Spring Security's context.
- `SecurityConfig.java` in SIMCOP and SIGEP permitted unauthenticated access to `/api/weather/**`, `/api/telegram/test`, `/h2-console/**`, and `/api/simcop/**`.
- `FileStorageService.java` allowed arbitrary file extensions without allowlist filtering.
- Multiple tactical controllers (`COAPlanController`, `LogisticsRequestController`, `OperationalGraphicController`, `BMAController`, `ForwardObserverController`, `SpecialtyCatalogController`, `UnitHistoryEventController`) lacked `@PreAuthorize` guards and ownership verification.
- `services/configService.ts` and `components/SettingsView.tsx` sent client-specified hardcoded `{ username: 'admin' }` payloads.

## 2. Logic Chain
To eliminate these vulnerabilities permanently and establish end-to-end defense-in-depth:
1. **Superadmin Shielding (F01)**:
   - Modified `DataInitializer.java` to read `SIMCOP_SUPERADMIN_PASSWORD` / `SIMCOP_ADMIN_PASSWORD` or generate a cryptographically secure random UUID password. Existing user accounts are checked and preserved without overwrite.
   - Updated `UserController.java` to enforce immutable superadmin and admin accounts: any attempt to demote, modify without authorization, or delete `santiago.salazar` or `admin` returns HTTP 403 Forbidden.
   - Removed backdoors from `SIGEP/.../AuthController.java` and hardcoded credentials in `scripts/ensure_admin.js`.
2. **Safe Model Loading (F02)**:
   - Modified `api_server.py` to support `safetensors.torch.load_file` and enforce `weights_only=True` in `torch.load()`, with robust fallback to the deterministic heuristic engine if the model file is missing or corrupt.
3. **Secrets & Webhook Protection (F03)**:
   - Replaced string equality in `OsintController.java` with constant-time byte comparison (`MessageDigest.isEqual`) on `OSINT_WEBHOOK_SECRET`.
   - Replaced the hardcoded Windy API key in `WeatherService.java` with `@Value("${app.weather.windy-api-key:${WINDY_API_KEY:}}")`.
4. **AES-256-GCM Storage Encryption (F04)**:
   - Implemented real `AES/GCM/NoPadding` in `ConfigurationService.java`, deriving a 256-bit key from `jwt.secret` via SHA-256 and generating a 12-byte random IV per encryption. Added backward compatibility fallback for legacy Base64 stored values.
   - Restricted `GET /api/config/gemini-api-key` in `ConfigurationController.java` to `ADMINISTRATOR`.
5. **Auth Bypass & Open Relay Elimination (F05)**:
   - Refactored `MilitaryUnitController.java` to retrieve authenticated principals strictly through `SecurityContextHolder.getContext().getAuthentication()`.
   - Removed open relays in `SecurityConfig.java` (`/api/weather/**`, `/api/telegram/test`, `/h2-console/**`, `/api/simcop/**`).
6. **File Storage & Path Traversal (F06)**:
   - Configured a strict extension allowlist (`jpg`, `jpeg`, `png`, `gif`, `webp`, `pdf`, `kml`, `kmz`, `json`, `geojson`, `txt`, `csv`, `doc`, `docx`, `xls`, `xlsx`) in `FileStorageService.java`, with path normalization and traversal prevention.
   - Enforced `Content-Disposition: attachment; filename=...` and `X-Content-Type-Options: nosniff` in `FileController.java`.
7. **BOLA / IDOR & RBAC (F07 & F08)**:
   - Added `@PreAuthorize` annotations and creator/owner checks across `COAPlanController`, `LogisticsRequestController`, `OperationalGraphicController`, `BMAController`, `ForwardObserverController`, `SpecialtyCatalogController`, and `UnitHistoryEventController`.
   - Enforced strict table allowlist `ALLOWED_TABLES` and comprehensive data masking in `AdminController.java`. Blocked truncation of `users` table with HTTP 403 Forbidden.
8. **Secure User Context & Transmission (F09 & F10)**:
   - Cleaned up `services/configService.ts` and `components/SettingsView.tsx` to eliminate hardcoded `{ username: 'admin' }` payloads, letting the backend extract user identity securely from JWT context.
9. **Unit Testing Suite**:
   - Added `backend/src/test/java/com/simcop/SecurityHardeningTests.java` testing superadmin deletion shielding, `users` table truncate protection, AES-256-GCM encryption/decryption, file extension allowlisting, path traversal blocking, and constant-time webhook comparison.

## 3. Caveats
- No caveats. All changes are backward-compatible with the frontend and do not break legitimate operational workflows.

## 4. Conclusion
All requirements for Milestone M1 (Features F01 through F10) have been completely implemented with genuine logic, strict security controls, and comprehensive tests. No backdoors, hardcoded secrets, or unauthenticated relays remain.

## 5. Verification Method
1. **Unit Test Suite**:
   Run `c:\DESARROLLOS\SIMCOP-main\tools\apache-maven-3.9.9\bin\mvn.cmd test` from directory `c:\DESARROLLOS\SIMCOP-main\backend` to execute `SecurityHardeningTests.java` and `SimcopApplicationTests.java`.
2. **Inspected Files**:
   - `backend/src/main/java/com/simcop/config/DataInitializer.java`
   - `backend/src/main/java/com/simcop/controller/UserController.java`
   - `backend/src/main/java/com/simcop/controller/AdminController.java`
   - `backend/src/main/java/com/simcop/service/ConfigurationService.java`
   - `backend/src/main/java/com/simcop/service/WeatherService.java`
   - `backend/src/main/java/com/simcop/service/FileStorageService.java`
   - `backend/src/main/java/com/simcop/config/SecurityConfig.java`
   - `backend/src/test/java/com/simcop/SecurityHardeningTests.java`
