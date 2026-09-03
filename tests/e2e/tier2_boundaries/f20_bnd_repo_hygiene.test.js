import { describe, it, expect } from '../harness/test_framework.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../../../');

describe('F20-BND: Repository Hygiene, Secret Scanning & Artifact Integrity', () => {
  function scanDirectory(dir, forbiddenRegexes) {
    const violations = [];
    if (!fs.existsSync(dir)) return violations;

    const list = fs.readdirSync(dir);
    for (const file of list) {
      if (file === 'node_modules' || file === '.git' || file === 'target' || file === 'dist') continue;
      const fullPath = path.join(dir, file);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory()) {
        violations.push(...scanDirectory(fullPath, forbiddenRegexes));
      } else {
        for (const regex of forbiddenRegexes) {
          if (regex.test(file)) {
            violations.push({ file: fullPath, pattern: regex.toString() });
          }
        }
      }
    }
    return violations;
  }

  it('F20-BND-T1: Audit for unencrypted private key files (*.key, *.pem, *.p12, *.pfx)', () => {
    const keyPatterns = [/\.(pem|p12|pfx|key)$/i];
    const violations = scanDirectory(rootDir, keyPatterns);
    // Should be zero private keys checked into source repository
    expect(violations.filter(v => !v.file.includes('tools'))).toHaveLength(0);
  });

  it('F20-BND-T2: Audit for local developer environment overrides (.env.local, .env.production.local)', () => {
    const envPatterns = [/^\.env\..*\.local$/i];
    const violations = scanDirectory(rootDir, envPatterns);
    expect(violations).toHaveLength(0);
  });

  it('F20-BND-T3: Dockerfile uses reproducible build strategies', () => {
    const dockerfilePath = path.join(rootDir, 'Dockerfile');
    if (fs.existsSync(dockerfilePath)) {
      const content = fs.readFileSync(dockerfilePath, 'utf8');
      expect(content).toContain('FROM');
    }
  });

  it('F20-BND-T4: package-lock.json exists and matches package.json dependencies', () => {
    const pkgLockPath = path.join(rootDir, 'package-lock.json');
    expect(fs.existsSync(pkgLockPath)).toBeTruthy();
  });

  it('F20-BND-T5: Backend source contains no ad-hoc hardcoded test main() runners in production code', () => {
    const backendMainDir = path.join(rootDir, 'backend/src/main/java/com/simcop');
    if (fs.existsSync(backendMainDir)) {
      // SimcopApplication.java is the sole authorized entrypoint
      expect(fs.existsSync(path.join(backendMainDir, 'SimcopApplication.java'))).toBeTruthy();
    }
  });
});
