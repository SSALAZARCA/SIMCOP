# Project: SIMCOP v4.0.0 — Active Cyber Defense (ACD) Master Architecture

## Architecture
Active Cyber Defense (ACD) provides tactical deception, real-time application self-protection (RASP), session anomaly detection (impossible travel & DLP anti-scraping), restricted C2 visibility exclusive to the Superadministrator, and priority Telegram dispatch.

```
                    Incoming HTTP Request
                              │
                              ▼
            ┌───────────────────────────────────┐
            │         IpBlacklistFilter         │ ──(Blacklisted IP)──> HTTP 403 Forbidden
            └───────────────────────────────────┘
                              │ (Clean IP)
                              ▼
            ┌───────────────────────────────────┐
            │       CanaryEndpointFilter        │ ──(Canary URL: /.env, /admin.php, etc.)──> Blacklist 24h + Alert + HTTP 404
            └───────────────────────────────────┘
                              │ (Standard URL)
                              ▼
            ┌───────────────────────────────────┐
            │  RaspFilter + CachedBodyRequest   │ ──(SQLi, Traversal, CMD, Scanners)──> Tarpit + Blacklist + Alert + HTTP 400
            └───────────────────────────────────┘
                              │ (Clean Payload)
                              ▼
            ┌───────────────────────────────────┐
            │        DlpThrottlingFilter        │ ──(Scraping burst >15 req/10s)──> Progressive Delay (tarpit) / HTTP 429
            └───────────────────────────────────┘
                              │ (Normal Rate)
                              ▼
            ┌───────────────────────────────────┐
            │      JwtAuthenticationFilter      │ ──(Token Revoked / Session Invalid)──> HTTP 401 Unauthorized
            └───────────────────────────────────┘
                              │
                              ├──> Impossible Travel Check (GeoIpService + GeoUtils) ──(V > 1000 km/h)──> Revoke Token + Alert
                              │
                              ▼
            ┌───────────────────────────────────┐
            │          Spring MVC / API         │
            │  - UserController (Honey-users)   │ ──(Honey-user login)──> Blacklist 24h + Alert + HTTP 401
            │  - AlertController (/api/alerts)  │ ──(Non-Superadmin)──> Filter out CYBER_INTRUSION_DETECTED
            └───────────────────────────────────┘
```

## Feature Inventory
| # | Feature | Description | Milestone | Source | Status |
|---|---------|-------------|-----------|--------|--------|
| 1 | Honey-Users Catalog | Trapped accounts (`c4isr_admin`, `general.rodriguez`, `root`, `backup_admin`, `superadmin_test`) | M1 | ORIGINAL_REQUEST R1 | DONE |
| 2 | Honey-User Instant Isolation | 24h IP blacklist and CRITICAL alert upon honey-user login attempt | M1 | ORIGINAL_REQUEST R1 | DONE |
| 3 | Canary Endpoints Filter | Trap routes (`/admin.php`, `/.env`, `/api/debug/dump`, `/actuator/env`, `/wp-login.php`) isolating IP and returning 404 | M1 | ORIGINAL_REQUEST R1 | DONE |
| 4 | IP Blacklist Enforcement | `IpBlacklistFilter` enforcing 24h lockouts across all application endpoints | M1 | ORIGINAL_REQUEST R1 | DONE |
| 5 | RASP Cached Body Request Wrapper | Multi-read `CachedBodyHttpServletRequest` preserving ServletInputStream for downstream Spring MVC | M1 | ORIGINAL_REQUEST R2 | DONE |
| 6 | RASP SQLi, Traversal & CMD Detection | Real-time pattern evaluation neutralizing attacks with HTTP 400 Bad Request | M1 | ORIGINAL_REQUEST R2 | DONE |
| 7 | RASP Scanner Detection & Tarpit | Neutralizing automated scanner User-Agents (`sqlmap`, `nikto`, `dirbuster`, `gobuster`) with artificial delay | M1 | ORIGINAL_REQUEST R2 | DONE |
| 8 | Session Tracking & Token Revocation | In-memory token blacklist and user revocation cutoffs in `SessionTrackingService` | M2 | ORIGINAL_REQUEST R3 | DONE |
| 9 | Offline GeoIP & Impossible Travel | Subnet-to-coordinates resolution and velocity calculation ($V > 1000$ km/h) triggering immediate token revocation | M2 | ORIGINAL_REQUEST R3 | DONE |
| 10 | DLP Anti-Scraping Throttling | Sliding window rate limiter on sensitive endpoints with progressive delay and HTTP 429 lockout | M2 | ORIGINAL_REQUEST R3 | DONE |
| 11 | CYBER_INTRUSION_DETECTED Enum | New alert type with CRITICAL severity in backend (`AlertType.java`) and frontend (`types/index.ts`) | M2 | ORIGINAL_REQUEST R4 | DONE |
| 12 | Superadmin-Exclusive C2 Visibility | Dual-layer filtering (Backend `AlertController` + Frontend `AlertPanelComponent` / `AlertsView`) | M2 | ORIGINAL_REQUEST R4 | DONE |
| 13 | Priority Telegram Dispatch | `TelegramService.sendCyberIntrusionAlert` notifying Superadministrator chat ID | M2 | ORIGINAL_REQUEST R4 | DONE |
| 14 | C2 Frontend Telemetry Formatting | Red cyber badge, IP, attack vector, and defensive action display in `AlertItemComponent.tsx` | M2 | ORIGINAL_REQUEST R4 | DONE |
| 15 | Central Cyber Defense Service & Audit | `ActiveCyberDefenseService` coordinating alerts, 24h IP isolation, and `AdminAuditLog` persistence | M2 | ORIGINAL_REQUEST R1-R4 | DONE |
| 16 | Verification & Zero Regressions | Unit, integration, build, and E2E test validation (`mvn test-compile`, `npm run build`, `npm test`) | M3 | ORIGINAL_REQUEST R5 | DONE |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Core Tactical Deception & RASP Filter Chain | `DeceptionCatalog`, `LoginRateLimiterService`, `IpBlacklistFilter`, `CanaryEndpointFilter`, `UserController`, `CachedBodyHttpServletRequest`, `RaspFilter`, `SecurityConfig` | Survey | DONE |
| M2 | Session Anomaly, Impossible Travel, DLP & Superadmin C2 / Telegram Alerting | `SessionTrackingService`, `JwtAuthenticationFilter`, `GeoIpService`, `ImpossibleTravelService`, `DlpThrottlingFilter`, `AlertType`, `types/index.ts`, `AlertController`, `TelegramService`, `ActiveCyberDefenseService`, `AlertPanelComponent`, `AlertsView`, `AlertItemComponent` | M1 | DONE |
| M3 | Comprehensive ACD Test Suite, Full Regression & Build Certification | `ActiveCyberDefenseTests.java`, `mvn test-compile`, `mvn clean test`, `npm run build`, `npm test` | M1, M2 | DONE |

## Code Layout
- `backend/src/main/java/com/simcop/config/`
  - `SecurityConfig.java` [Spring Security filter chain order]
  - `CachedBodyHttpServletRequest.java` [Multi-read Servlet wrapper]
- `backend/src/main/java/com/simcop/security/`
  - `DeceptionCatalog.java` [Honey-users & Canary endpoints constants]
  - `IpBlacklistFilter.java` [Global 24h IP isolation filter]
  - `CanaryEndpointFilter.java` [Canary deception trap filter]
  - `RaspFilter.java` [Real-time payload inspection filter]
  - `DlpThrottlingFilter.java` [Anti-scraping sensitive endpoint filter]
- `backend/src/main/java/com/simcop/service/`
  - `LoginRateLimiterService.java` [Extended with 24h blacklist methods]
  - `ActiveCyberDefenseService.java` [Central ACD coordinator]
  - `SessionTrackingService.java` [JWT token & user revocation management]
  - `GeoIpService.java` [Offline air-gapped subnet-to-coordinates mapper]
  - `ImpossibleTravelService.java` [Velocity-based travel anomaly detector]
  - `TelegramService.java` [Extended with `sendCyberIntrusionAlert`]
- `backend/src/main/java/com/simcop/model/`
  - `AlertType.java` [Added `CYBER_INTRUSION_DETECTED`]
- `backend/src/main/java/com/simcop/controller/`
  - `UserController.java` [Honey-user authentication trap]
  - `AlertController.java` [Superadmin-exclusive alert filtering]
- `types/index.ts` [Added `CYBER_INTRUSION_DETECTED` to AlertType enum]
- `components/`
  - `AlertPanelComponent.tsx` [Frontend defense-in-depth filtering]
  - `AlertsView.tsx` [Frontend defense-in-depth filtering]
  - `AlertItemComponent.tsx` [ACD cyber alert badge & telemetry display]
- `backend/src/test/java/com/simcop/ActiveCyberDefenseM1Tests.java` [M1 Automated Tests]
- `backend/src/test/java/com/simcop/ActiveCyberDefenseAdversarialStressTests.java` [M1 Adversarial Tests]
- `backend/src/test/java/com/simcop/ActiveCyberDefenseTests.java` [Master ACD Test Suite]
