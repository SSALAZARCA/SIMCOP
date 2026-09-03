# DISPATCH — worker_m4

## 2026-09-02T12:38:35Z

**Task**: Implement Milestone M4 (Type Safety, Build Verification & Zero Residue Cleanup — F19 & F20).
**Working Directory**: `c:/DESARROLLOS/SIMCOP-main/.agents/worker_m4/`

**Target Scope**:
1. F19 (R4 TypeScript Type Safety & Clean Compilation):
   - Fix 5 TypeScript errors:
     - `components/TelegramConfigComponent.tsx`: `configService` missing import/reference.
     - `utils/geminiService.ts`: `avgSlope` variable scope/reference.
     - `components/Map3DDisplayComponent.tsx`: `onPiccDrawingComplete()` argument count mismatch.
   - Run `npx tsc --noEmit` and `npm run build` and ensure 0 errors and clean build output in `dist/`.
2. F20 (R4 Zero Residue & Artifact Cleanup):
   - Purge tracked temporary and orphan files (`~$pacidades_SIMCOP.doc`, `SIMCOP_SourceCode.zip`, `Capacidades_SIMCOP.doc`, `test-json.js`, `test-login.json`, `test-regex.js`, `test-user.json`, `add_personnel_permission.py`, `add_personnel_permission.sql`, `spot-sender.html`, `backend/create_specialty_table.sql`, `backend/create_table.py`, `backend/drop-users-tables.sql`, `backend/init_mysql_table.ps1`, `backend/init_specialty_catalog.sql`, hardcoded password classes in `backend/src/main/java/com/simcop/util/`, and `.pyc` caches).
   - Ensure clean `git status` without untracked debris.

**Mandatory Integrity Warning**:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

**Verification**:
1. Run `npx tsc --noEmit`
2. Run `npm run build`
3. Run Maven tests: `& "tools/apache-maven-3.9.9/bin/mvn.cmd" test`
4. Run E2E tests: `node tests/e2e/runner.js --tier=1` and `node tests/e2e/runner.js --tier=2`
5. Write `handoff.md` in `c:/DESARROLLOS/SIMCOP-main/.agents/worker_m4/handoff.md`.
