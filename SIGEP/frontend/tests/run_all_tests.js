/**
 * SIGEP Master Adversarial Test Runner — Milestone 3
 * Runs all 4 test suites, collects pass/fail telemetry, and prints tactical execution summary.
 */

import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const suites = [
  { name: 'Suite 1: UnitContext Reactivity & Scope Isolation', file: 'unit_context_reactivity.test.js' },
  { name: 'Suite 2: Recharts Custom Tactical Tooltip & Edge Cases', file: 'recharts_tooltip_adversarial.test.js' },
  { name: 'Suite 3: Metric Recalculation & Doctrinal Boundaries', file: 'metrics_recalculation_adversarial.test.js' },
  { name: 'Suite 4: API Error Resilience & Race Conditions', file: 'api_resilience_adversarial.test.js' }
];

console.log('\x1b[1m\x1b[36m========================================================================\x1b[0m');
console.log('\x1b[1m\x1b[36m  SIGEP M3 ADVERSARIAL CHALLENGER TEST RUNNER\x1b[0m');
console.log('\x1b[1m\x1b[36m  Empirical Verification: AnalysisDashboard | UnitContext | Recharts\x1b[0m');
console.log('\x1b[1m\x1b[36m========================================================================\x1b[0m\n');

let totalPassed = 0;
let totalFailed = 0;
const startTime = performance.now();

async function runSuite(suite) {
  return new Promise((resolve) => {
    const fullPath = path.resolve(__dirname, suite.file);
    console.log(`\x1b[33m▶ Executing: ${suite.name} ...\x1b[0m`);

    const proc = spawn('node', ['--test', fullPath], {
      stdio: 'pipe'
    });

    let output = '';
    proc.stdout.on('data', data => { output += data.toString(); });
    proc.stderr.on('data', data => { output += data.toString(); });

    proc.on('close', (code) => {
      // Parse output for counts
      const passMatch = output.match(/ℹ pass (\d+)/);
      const failMatch = output.match(/ℹ fail (\d+)/);
      const passed = passMatch ? parseInt(passMatch[1], 10) : 0;
      const failed = failMatch ? parseInt(failMatch[1], 10) : (code !== 0 ? 1 : 0);

      totalPassed += passed;
      totalFailed += failed;

      if (code === 0 && failed === 0) {
        console.log(`\x1b[32m✔ ${suite.name} PASSED (${passed} tests)\x1b[0m\n`);
      } else {
        console.log(`\x1b[31m✖ ${suite.name} FAILED (${failed} failed, ${passed} passed)\x1b[0m`);
        console.log(output);
        console.log('\n');
      }
      resolve({ code, passed, failed });
    });
  });
}

for (const suite of suites) {
  await runSuite(suite);
}

const totalDuration = ((performance.now() - startTime) / 1000).toFixed(2);

console.log('\x1b[1m\x1b[36m========================================================================\x1b[0m');
console.log('\x1b[1m  FINAL ADVERSARIAL EXECUTION SUMMARY\x1b[0m');
console.log('\x1b[1m\x1b[36m========================================================================\x1b[0m');
console.log(`  Total Suites:   ${suites.length}`);
console.log(`  Total Tests:    ${totalPassed + totalFailed}`);
console.log(`  Passed Tests:   \x1b[32m${totalPassed}\x1b[0m`);
console.log(`  Failed Tests:   \x1b[${totalFailed > 0 ? '31' : '32'}m${totalFailed}\x1b[0m`);
console.log(`  Duration:       ${totalDuration}s`);
console.log('\x1b[1m\x1b[36m========================================================================\x1b[0m\n');

// Clean up temporary prototype test file if exists
try {
  import('node:fs').then(fs => {
    const protoPath = path.resolve(__dirname, 'prototype.test.js');
    if (fs.existsSync(protoPath)) fs.unlinkSync(protoPath);
  });
} catch {
  // ignore
}

process.exit(totalFailed > 0 ? 1 : 0);
