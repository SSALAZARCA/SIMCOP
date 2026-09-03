# Technical Remediation Analysis — Milestone M1 (Iteration 2)

**Author**: Explorer M1 Remediation (Iteration 2)  
**Target Milestone**: M1 (Superadmin Shielding & Core Security Hardening — F01 to F10)  
**Integrity Mode**: Development / Zero Tolerance  

---

## 1. Executive Summary

Following the comprehensive reports from Auditor M1, Reviewer 1, Reviewer 2, and Challenger M1_2, an exhaustive investigation was conducted across the SIMCOP and SIGEP codebases. The core architectural and security hardening implementations across features F01 through F10 (AES-256-GCM authenticated encryption, constant-time webhook token verification, PyTorch safe weight loading, IDOR/BOLA access control on tactical entities, Spring Security authenticated context extraction, and superadmin account immutability) are robust, genuine, and verified.

Four specific integrity and hygiene findings were cataloged for Worker M1 (Iteration 2) remediation:

| # | Violation | Exact File & Coordinates | Root Cause | Proposed Solution |
|---|-----------|-------------------------|------------|-------------------|
| 1 | Reflection Field Mismatch in Tests | `backend/src/test/java/com/simcop/SecurityHardeningTests.java:35` | Reflection targeted `"userRepository"` but `UserController.java:23` defines field as `"repository"`. | Ensure `ReflectionTestUtils.setField(userController, "repository", userRepository)` is set. |
| 2 | Hardcoded Superadmin Password in SIGEP | `SIGEP/backend/src/main/java/com/sigep/SigepApplication.java:43` | Plaintext password `"ssc841209"` hardcoded in database seed CommandLineRunner. | Retrieve password dynamically from `SIMCOP_SUPERADMIN_PASSWORD` / `SIGEP_ADMIN_PASSWORD` env vars or secure random UUID fallback. |
| 3 | Plaintext Superadmin Password in Frontend Hook | `hooks/useSimulatedData.ts:148` | Plaintext password `'ssc841209'` used in simulated admin user creation. | Sanitize mock value with non-sensitive simulated mock string `'simcop_mock_admin_pass'`. |
| 4 | Hardcoded OSINT Secret in Settings UI | `components/SettingsView.tsx:666, 670` | Hardcoded sample secret `"simcop-osint-secret-2026"` displayed in input and copied to clipboard. | Replace with explanatory server-managed environment variable label (`OSINT_WEBHOOK_SECRET`) and inform tooltip/modal. |

---

## 2. In-Depth Root Cause & Remediation Blueprint

### Violation 1: Test Reflection Field Mismatch
- **File**: `backend/src/test/java/com/simcop/SecurityHardeningTests.java` (Line 35)
- **Component**: `UserController.java` (Line 23)
- **Analysis**:
  In `UserController.java`, the field is defined as:
  ```java
  @Autowired
  private UserRepository repository;
  ```
  In unit testing with `ReflectionTestUtils.setField`, Spring searches the declared fields of `UserController` by name. When searching for `"userRepository"`, it fails with `IllegalArgumentException: Could not find field 'userRepository'`.
- **Target Line**:
  ```java
  org.springframework.test.util.ReflectionTestUtils.setField(userController, "repository", userRepository);
  ```
- **Verification Status**:
  Verified via `c:\DESARROLLOS\SIMCOP-main\tools\apache-maven-3.9.9\bin\mvn.cmd test`. The test suite currently compiles and runs with 7/7 tests passing.

---

### Violation 2: Hardcoded Plaintext Password in SIGEP Seeder
- **File**: `SIGEP/backend/src/main/java/com/sigep/SigepApplication.java` (Lines 37–51)
- **Analysis**:
  The SIGEP backend seeder initializes `santiago.salazar` with plaintext `"ssc841209"`. Requirement R1 strictly forbids plaintext passwords in source code.
- **Remediation Specification**:
  Update `initDatabase` to resolve `SIMCOP_SUPERADMIN_PASSWORD` or `SIGEP_ADMIN_PASSWORD` from `System.getenv(...)`, falling back to `java.util.UUID.randomUUID().toString()`.
- **Before**:
  ```java
  @Bean
  public CommandLineRunner initDatabase(UserRepository userRepository) {
      return args -> {
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
      };
  }
  ```
- **After**:
  ```java
  @Bean
  public CommandLineRunner initDatabase(UserRepository userRepository) {
      return args -> {
          if (userRepository.findByUsername("santiago.salazar").isEmpty()) {
              String adminPassword = System.getenv("SIMCOP_SUPERADMIN_PASSWORD");
              if (adminPassword == null || adminPassword.trim().isEmpty()) {
                  adminPassword = System.getenv("SIGEP_ADMIN_PASSWORD");
              }
              if (adminPassword == null || adminPassword.trim().isEmpty()) {
                  adminPassword = java.util.UUID.randomUUID().toString();
              }
              User admin = new User();
              admin.setUsername("santiago.salazar");
              admin.setPassword(adminPassword);
              admin.setRole("ROLE_ADMINISTRATOR");
              admin.setDisplayName("Santiago Salazar (Admin)");
              admin.setAssignedUnitId("NATIONAL");
              userRepository.save(admin);
              System.out.println("✅ Usuario maestro 'santiago.salazar' sembrado en la BD de SIGEP con credenciales protegidas.");
          }
      };
  }
  ```

---

### Violation 3: Plaintext Password in Simulated Data Hook
- **File**: `hooks/useSimulatedData.ts` (Line 148)
- **Analysis**:
  `hooks/useSimulatedData.ts` initializes fallback local state using `hashedPassword: hashPassword('ssc841209')`.
- **Remediation Specification**:
  Replace `'ssc841209'` with `'simcop_mock_admin_pass'`.
- **Before**:
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
- **After**:
  ```typescript
  const createDefaultAdminUser = (): User => {
    return {
      id: 'default-admin-001', // Fixed ID for consistency
      username: 'santiago.salazar',
      displayName: 'Santiago Salazar',
      hashedPassword: hashPassword('simcop_mock_admin_pass'),
      role: UserRole.ADMINISTRATOR,
      permissions: Object.values(ViewType),
      assignedUnitId: null,
    };
  };
  ```

---

### Violation 4: Hardcoded OSINT Secret in Settings UI
- **File**: `components/SettingsView.tsx` (Lines 658–677)
- **Analysis**:
  `SettingsView.tsx` rendered `value="simcop-osint-secret-2026"` and allowed copying it to clipboard. Because OSINT webhook authentication was migrated to server-side `OSINT_WEBHOOK_SECRET` environment variable with constant-time comparison (F03), displaying a hardcoded dummy secret in the UI is misleading and flagged as a residual credential.
- **Remediation Specification**:
  Change the field to indicate that the webhook token is configured on the backend via the `OSINT_WEBHOOK_SECRET` environment variable, with an informative action button.
- **Before**:
  ```tsx
  <div>
      <label style={{ display: 'block', color: '#64748b', fontSize: '0.75rem', textTransform: 'uppercase', marginBottom: '0.25rem', fontWeight: 'bold' }}>
          Cabecera de Autenticación (X-Webhook-Token)
      </label>
      <div style={{ display: 'flex', gap: '0.5rem' }}>
          <input 
              type="text" 
              readOnly 
              value="simcop-osint-secret-2026" 
              style={{ flex: 1, backgroundColor: '#0f172a', border: '1px solid #334155', color: '#a3e635', padding: '0.5rem', borderRadius: '4px', fontSize: '0.875rem' }}
          />
          <button 
              onClick={() => navigator.clipboard.writeText('simcop-osint-secret-2026')}
              style={{ backgroundColor: '#334155', border: 'none', color: '#f8fafc', padding: '0.5rem 1rem', borderRadius: '4px', cursor: 'pointer', fontSize: '0.875rem' }}
          >
              Copiar
          </button>
      </div>
  </div>
  ```
- **After**:
  ```tsx
  <div>
      <label style={{ display: 'block', color: '#64748b', fontSize: '0.75rem', textTransform: 'uppercase', marginBottom: '0.25rem', fontWeight: 'bold' }}>
          Cabecera de Autenticación (X-Webhook-Token)
      </label>
      <div style={{ display: 'flex', gap: '0.5rem' }}>
          <input 
              type="text" 
              readOnly 
              value="Configurado en variable de entorno OSINT_WEBHOOK_SECRET" 
              placeholder="Configurado en variable de entorno OSINT_WEBHOOK_SECRET"
              style={{ flex: 1, backgroundColor: '#0f172a', border: '1px solid #334155', color: '#94a3b8', padding: '0.5rem', borderRadius: '4px', fontSize: '0.875rem' }}
          />
          <button 
              onClick={() => alert('El token de autenticación del webhook debe configurarse en el servidor mediante la variable de entorno OSINT_WEBHOOK_SECRET.')}
              style={{ backgroundColor: '#334155', border: 'none', color: '#f8fafc', padding: '0.5rem 1rem', borderRadius: '4px', cursor: 'pointer', fontSize: '0.875rem' }}
          >
              Info
          </button>
      </div>
  </div>
  ```

---

## 3. Verification Protocol for Worker M1 (Iteration 2)

Worker M1 must execute the following commands post-implementation:

1. **Run Maven Backend Unit Tests**:
   ```powershell
   c:\DESARROLLOS\SIMCOP-main\tools\apache-maven-3.9.9\bin\mvn.cmd test
   ```
   **Expected**: `BUILD SUCCESS`, `Tests run: 7, Failures: 0, Errors: 0, Skipped: 0`.

2. **Run Secret Elimination Scans**:
   ```powershell
   # Scan for residual plain text superadmin passwords
   Select-String -Path "c:\DESARROLLOS\SIMCOP-main\SIGEP\backend\src\main\java\com\sigep\SigepApplication.java" -Pattern "ssc841209"
   Select-String -Path "c:\DESARROLLOS\SIMCOP-main\hooks\useSimulatedData.ts" -Pattern "ssc841209"
   Select-String -Path "c:\DESARROLLOS\SIMCOP-main\components\SettingsView.tsx" -Pattern "simcop-osint-secret-2026"
   ```
   **Expected**: 0 matches found across all active implementation files.

3. **Run E2E Test Suite**:
   ```powershell
   node tests/e2e/run_all_e2e_tests.js
   ```
   **Expected**: 100% pass rate on all Milestone M1 features (F01–F10, Tier 1 and Tier 2 boundary suites).
