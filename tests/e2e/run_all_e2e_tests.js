/**
 * Entrypoint: run_all_e2e_tests.js
 * Invokes SIMCOP Master E2E runner.
 */
import { runAllTests } from './runner.js';

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
  console.error('Test Runner Execution Error:', err);
  process.exit(1);
});
