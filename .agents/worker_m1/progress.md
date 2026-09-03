# Progress Log - Worker M1

**Last visited**: 2026-09-01T21:21:00-05:00
**Status**: Completed (Features F01 through F10)

## Milestones & Accomplishments
1. **F01 (R1: Superadmin Shielding & Immutability)**:
   - Protected `santiago.salazar` and `admin` against demotion, deletion (403 Forbidden).
   - Startup uses `SIMCOP_SUPERADMIN_PASSWORD` or secure random password; never overwrites existing users.
   - Truncation of `users` table unconditionally blocked (403 Forbidden).
   - Backdoors removed from `SIGEP/.../AuthController.java` and `scripts/ensure_admin.js`.
2. **F02 (SEC-01: PyTorch Safe Loading & RCE Mitigation)**:
   - Enforced safetensors format and `weights_only=True` in `api_server.py` with fallback to deterministic heuristic engine.
3. **F03 (SEC-03: Secrets & Webhook Protection)**:
   - Constant-time signature comparison with `MessageDigest.isEqual` in `OsintController.java`.
   - Removed hardcoded Windy API key from `WeatherService.java`, injecting `WINDY_API_KEY`.
4. **F04 (SEC-04: JWT Secret & AES-256-GCM Storage Encryption)**:
   - Production AES-256-GCM encryption implemented in `ConfigurationService.java` with 12-byte random IVs and SHA-256 key derivation.
   - `GET /api/config/gemini-api-key` restricted to `ADMINISTRATOR`.
5. **F05 (SEC-06: Auth Bypass & Open Relay Elimination)**:
   - Removed token header parsing in `MilitaryUnitController.java`, adopting `SecurityContextHolder`.
   - Closed unauthenticated relays in `SecurityConfig.java` (`/api/weather/**`, `/api/telegram/test`, `/h2-console/**`, `/api/simcop/**`).
6. **F06 (SEC-07: Path Traversal & File Upload Security)**:
   - Strict file extension allowlist and filename sanitization in `FileStorageService.java`.
   - Attachment download disposition and `X-Content-Type-Options: nosniff` in `FileController.java`.
7. **F07 (SEC-08: BOLA / IDOR Protection)**:
   - Enforced `@PreAuthorize` and ownership validation in `COAPlanController`, `LogisticsRequestController`, `OperationalGraphicController`, `BMAController`, `ForwardObserverController`, `SpecialtyCatalogController`, and `UnitHistoryEventController`.
8. **F08 (SEC-09: Admin Panel Data Masking & Table Allowlist)**:
   - Strict table allowlist in `AdminController.java`, extensive sensitive field redaction, and `users` truncation ban.
9. **F09 (SEC-10: Secure Authenticated User Context)**:
   - Server extracts user exclusively from `SecurityContextHolder`.
   - Removed hardcoded `{ username: 'admin' }` payloads from `configService.ts` and `SettingsView.tsx`.
10. **F10 (SEC-11: Secure API Key Transmission)**:
    - API keys transmitted via Authorization header or secure backend storage, never in URL parameters.
11. **Testing & QA**:
    - Created unit test suite in `backend/src/test/java/com/simcop/SecurityHardeningTests.java`.
