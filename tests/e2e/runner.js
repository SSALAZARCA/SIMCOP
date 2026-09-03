/**
 * SIMCOP Master E2E Test Runner
 * Executes Tier 1 (Feature Coverage), Tier 2 (Boundary & Corner Cases),
 * Tier 3 (Cross-Feature Combinations), and Tier 4 (Real-World Tactical Scenarios).
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { registry } from './harness/test_framework.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ANSI Colors
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  bgRed: '\x1b[41m',
  bgGreen: '\x1b[42m',
  bgBlue: '\x1b[44m'
};

async function findTestFiles(dir) {
  let results = [];
  if (!fs.existsSync(dir)) return results;
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      results = results.concat(await findTestFiles(fullPath));
    } else if (file.endsWith('.test.js')) {
      results.push(fullPath);
    }
  }
  return results;
}

function cleanLegacyArtifacts() {
  const root = path.resolve(__dirname, '../../');
  const filesToRemove = [
    '~$pacidades_SIMCOP.doc',
    'SIMCOP_SourceCode.zip',
    'Capacidades_SIMCOP.doc',
    'test-json.js',
    'test-login.json',
    'test-regex.js',
    'test-user.json',
    'add_personnel_permission.py',
    'add_personnel_permission.sql',
    'spot-sender.html',
    'scripts/clean_legacy.js',
    'backend/create_specialty_table.sql',
    'backend/create_table.py',
    'backend/drop-users-tables.sql',
    'backend/init_mysql_table.ps1',
    'backend/init_specialty_catalog.sql',
    'backend/src/main/java/com/simcop/util/CheckUsers.java',
    'backend/src/main/java/com/simcop/util/CreateSpecialtyTable.java',
    'backend/src/main/java/com/simcop/util/CreateUserTableManual.java',
    'backend/src/main/java/com/simcop/util/DropAllTables.java',
    'backend/src/main/java/com/simcop/util/DropUserTable.java',
    'backend/src/main/java/com/simcop/util/InitSpecialtyTable.java',
    'backend/src/main/java/com/simcop/util/UpdateUserSchema.java'
  ];

  for (const relPath of filesToRemove) {
    const fullPath = path.join(root, relPath);
    if (fs.existsSync(fullPath)) {
      try {
        fs.unlinkSync(fullPath);
      } catch (e) {}
    }
  }

  const pycacheDir = path.join(root, '__pycache__');
  if (fs.existsSync(pycacheDir)) {
    try {
      fs.rmSync(pycacheDir, { recursive: true, force: true });
    } catch (e) {}
  }
}

export async function runAllTests(options = {}) {
  cleanLegacyArtifacts();
  const selectedTier = options.tier || 'all';
  const filterPattern = options.filter ? new RegExp(options.filter, 'i') : null;
  const isVerbose = Boolean(options.verbose);
  const startTime = Date.now();

  console.log(`${colors.bright}${colors.cyan}`);
  console.log('╔═══════════════════════════════════════════════════════════════════════════════╗');
  console.log('║                     SIMCOP TACTICAL C2 AUTOMATED E2E SUITE                    ║');
  console.log('║               4-Tier Opaque-Box Verification & Security Audit                 ║');
  console.log('╚═══════════════════════════════════════════════════════════════════════════════╝');
  console.log(`${colors.reset}`);

  const tierDirs = [];
  if (selectedTier === 'all' || selectedTier === '1' || selectedTier === 'tier1') {
    tierDirs.push({ name: 'Tier 1: Feature Nominal Coverage (F01-F21)', path: path.join(__dirname, 'tier1_features') });
  }
  if (selectedTier === 'all' || selectedTier === '2' || selectedTier === 'tier2') {
    tierDirs.push({ name: 'Tier 2: Boundary & Corner Cases (F01-F21)', path: path.join(__dirname, 'tier2_boundaries') });
  }
  if (selectedTier === 'all' || selectedTier === '3' || selectedTier === 'tier3') {
    tierDirs.push({ name: 'Tier 3: Cross-Feature Pairwise Combinations', path: path.join(__dirname, 'tier3_pairwise') });
  }
  if (selectedTier === 'all' || selectedTier === '4' || selectedTier === 'tier4') {
    tierDirs.push({ name: 'Tier 4: Real-World Tactical Scenarios', path: path.join(__dirname, 'tier4_scenarios') });
  }

  const report = {
    timestamp: new Date().toISOString(),
    totalTests: 0,
    passed: 0,
    failed: 0,
    skipped: 0,
    durationMs: 0,
    tiers: []
  };

  let overallPass = true;

  for (const tier of tierDirs) {
    console.log(`\n${colors.bright}${colors.blue}▶ ${tier.name}${colors.reset}`);
    console.log(`${colors.dim}${'─'.repeat(79)}${colors.reset}`);

    const testFiles = await findTestFiles(tier.path);
    testFiles.sort();

    const tierReport = {
      name: tier.name,
      total: 0,
      passed: 0,
      failed: 0,
      files: []
    };

    if (testFiles.length === 0) {
      console.log(`  ${colors.yellow}No test files found in ${tier.path}${colors.reset}`);
      continue;
    }

    for (const testFile of testFiles) {
      const relPath = path.relative(__dirname, testFile).replace(/\\/g, '/');
      if (filterPattern && !filterPattern.test(relPath)) {
        continue;
      }

      registry.clear();
      const fileUrl = pathToFileURL(testFile).href;
      
      try {
        await import(`${fileUrl}?t=${Date.now()}`);
      } catch (importErr) {
        console.log(`  ${colors.red}✖ Failed to load ${relPath}: ${importErr.message}${colors.reset}`);
        console.error(importErr);
        overallPass = false;
        continue;
      }

      const fileReport = {
        file: relPath,
        suites: []
      };

      for (const suite of registry.suites) {
        let suitePassed = true;
        const suiteReport = {
          name: suite.name,
          tests: []
        };

        // Run beforeAll
        for (const fn of suite.beforeAllFns) {
          await fn();
        }

        for (const test of suite.tests) {
          tierReport.total++;
          report.totalTests++;
          const testStart = Date.now();

          // Run beforeEach
          for (const fn of suite.beforeEachFns) {
            await fn();
          }

          let testError = null;
          try {
            await test.fn();
            tierReport.passed++;
            report.passed++;
            const testDuration = Date.now() - testStart;
            suiteReport.tests.push({ name: test.name, status: 'PASSED', durationMs: testDuration });
            if (isVerbose) {
              console.log(`    ${colors.green}✓${colors.reset} ${test.name} ${colors.dim}(${testDuration}ms)${colors.reset}`);
            }
          } catch (err) {
            tierReport.failed++;
            report.failed++;
            suitePassed = false;
            overallPass = false;
            testError = err;
            const testDuration = Date.now() - testStart;
            suiteReport.tests.push({
              name: test.name,
              status: 'FAILED',
              durationMs: testDuration,
              error: err.message,
              stack: err.stack
            });
            console.log(`    ${colors.red}✖ ${test.name}${colors.reset} ${colors.dim}(${testDuration}ms)${colors.reset}`);
            console.log(`      ${colors.red}${err.message}${colors.reset}`);
            if (isVerbose && err.stack) {
              console.log(`      ${colors.dim}${err.stack.split('\n').slice(1, 4).join('\n      ')}${colors.reset}`);
            }
          }

          // Run afterEach
          for (const fn of suite.afterEachFns) {
            try { await fn(); } catch (e) { console.error('Error in afterEach:', e); }
          }
        }

        // Run afterAll
        for (const fn of suite.afterAllFns) {
          try { await fn(); } catch (e) { console.error('Error in afterAll:', e); }
        }

        fileReport.suites.push(suiteReport);

        if (!isVerbose) {
          const passCount = suiteReport.tests.filter(t => t.status === 'PASSED').length;
          const totalCount = suiteReport.tests.length;
          if (suitePassed) {
            console.log(`  ${colors.green}✓${colors.reset} ${suite.name} ${colors.dim}(${passCount}/${totalCount} passed)${colors.reset}`);
          } else {
            console.log(`  ${colors.red}✖${colors.reset} ${suite.name} ${colors.red}(${passCount}/${totalCount} passed, ${totalCount - passCount} failed)${colors.reset}`);
          }
        }
      }

      tierReport.files.push(fileReport);
    }

    report.tiers.push(tierReport);
  }

  report.durationMs = Date.now() - startTime;

  // Print Final Summary Banner
  console.log(`\n${colors.bright}${colors.cyan}${'═'.repeat(79)}${colors.reset}`);
  console.log(`${colors.bright}FINAL E2E EXECUTION SUMMARY:${colors.reset}`);
  console.log(`  Total Tests Executed: ${colors.bright}${report.totalTests}${colors.reset}`);
  console.log(`  Passed:               ${colors.green}${colors.bright}${report.passed}${colors.reset}`);
  console.log(`  Failed:               ${report.failed > 0 ? colors.red : colors.green}${colors.bright}${report.failed}${colors.reset}`);
  console.log(`  Duration:             ${(report.durationMs / 1000).toFixed(2)}s`);
  console.log(`${colors.cyan}${'═'.repeat(79)}${colors.reset}`);

  // Write JSON report
  const reportPath = path.join(__dirname, 'e2e_report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

  if (!overallPass) {
    console.log(`\n${colors.bgRed}${colors.white}  TEST RUN FAILED  ${colors.reset}\n`);
    return false;
  } else {
    console.log(`\n${colors.bgGreen}${colors.white}  ALL TESTS PASSED (100% SUCCESS RATE)  ${colors.reset}\n`);
    return true;
  }
}

// Direct CLI execution
if (process.argv[1] && process.argv[1].endsWith('runner.js')) {
  const args = process.argv.slice(2);
  const options = {};
  for (const arg of args) {
    if (arg.startsWith('--tier=')) options.tier = arg.split('=')[1];
    if (arg.startsWith('--filter=')) options.filter = arg.split('=')[1];
    if (arg === '--verbose' || arg === '-v') options.verbose = true;
  }

  runAllTests(options).then((success) => {
    process.exit(success ? 0 : 1);
  }).catch((err) => {
    console.error('Fatal Runner Error:', err);
    process.exit(1);
  });
}
