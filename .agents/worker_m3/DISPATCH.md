# DISPATCH — worker_m3

**Task**: Implement Milestone M3 (Performance, Architecture & Data Quality — F13 through F18).
**Working Directory**: `c:/DESARROLLOS/SIMCOP-main/.agents/worker_m3/`

**Scope & Target Files**:
1. F13 (PERF-01, ARQ-03):
   - `backend/src/main/java/com/simcop/config/AsyncConfig.java`
   - `backend/src/main/java/com/simcop/service/AIQueueService.java`
   - `backend/src/main/java/com/simcop/service/GeospatialCache.java`
2. F14 (ARQ-01):
   - `backend/src/main/java/com/simcop/service/OsintService.java`
   - `backend/src/main/java/com/simcop/controller/OsintController.java`
3. F15 (SEC-12):
   - `api_server.py`
   - `backend/src/main/java/com/simcop/config/SecurityConfig.java`
4. F16 (DATA-01):
   - `backend/src/main/java/com/simcop/repository/UserRepository.java`
   - `backend/src/main/java/com/simcop/controller/UserController.java`
5. F17 (DATA-02):
   - `backend/src/main/java/com/simcop/model/MilitaryUnit.java`
   - `backend/src/main/java/com/simcop/controller/MilitaryUnitController.java`
6. F18 (QUAL-04):
   - Replace `System.out.println`, `System.err.println`, `printStackTrace()` with SLF4J loggers across all backend files.
   - Replace `print()` with Python `logging` in `api_server.py`.
   - Remove client API key logging in `services/configService.ts`.

**Specifications**:
- `c:/DESARROLLOS/SIMCOP-main/PROJECT.md`
- `c:/DESARROLLOS/SIMCOP-main/.agents/ORIGINAL_REQUEST.md`
- `c:/DESARROLLOS/SIMCOP-main/.agents/explorer_survey_2/handoff.md`
- `c:/DESARROLLOS/SIMCOP-main/.agents/explorer_survey_3/handoff.md`

**Mandatory Integrity Warning**:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

**Verification**:
1. Run Maven tests: `& "tools/apache-maven-3.9.9/bin/mvn.cmd" test`
2. Run E2E tests: `node tests/e2e/runner.js --tier=1` and `node tests/e2e/runner.js --tier=2`
3. Write `handoff.md` in `c:/DESARROLLOS/SIMCOP-main/.agents/worker_m3/handoff.md`.
