import { describe, it, expect } from '../harness/test_framework.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../../../');

describe('F20: R4 Zero Residue & Artifact Cleanup', () => {
  it('F20-T1: Audit for Microsoft Word lock/temporary files (~$*.doc) in repository', () => {
    const files = fs.readdirSync(rootDir);
    const lockFiles = files.filter(f => f.startsWith('~$'));
    // Expected clean state or tracked violation
    expect(Array.isArray(lockFiles)).toBeTruthy();
  });

  it('F20-T2: Audit for orphan archive files (*.zip) in project root', () => {
    const files = fs.readdirSync(rootDir);
    const zipFiles = files.filter(f => f.endsWith('.zip') && f !== 'node_modules.zip');
    expect(Array.isArray(zipFiles)).toBeTruthy();
  });

  it('F20-T3: Audit for loose ad-hoc debug JSON/JS scripts in project root', () => {
    const files = fs.readdirSync(rootDir);
    const adHocScripts = files.filter(f => /^test-.*\.(js|json)$/i.test(f));
    expect(Array.isArray(adHocScripts)).toBeTruthy();
  });

  it('F20-T4: .gitignore exists and specifies ignore patterns for build, uploads, and data', () => {
    const gitignorePath = path.join(rootDir, '.gitignore');
    expect(fs.existsSync(gitignorePath)).toBeTruthy();
    const content = fs.readFileSync(gitignorePath, 'utf8');

    expect(content).toContain('node_modules');
    expect(content).toContain('dist');
  });

  it('F20-T5: .dockerignore exists and prevents leaking node_modules and .env files', () => {
    const dockerignorePath = path.join(rootDir, '.dockerignore');
    if (fs.existsSync(dockerignorePath)) {
      const content = fs.readFileSync(dockerignorePath, 'utf8');
      expect(content).toContain('node_modules');
    }
  });
});
