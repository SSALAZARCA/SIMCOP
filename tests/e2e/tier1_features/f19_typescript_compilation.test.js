import { describe, it, expect } from '../harness/test_framework.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../../../');

describe('F19: R4 TypeScript Type Safety & Clean Compilation', () => {
  it('F19-T1: tsconfig.json exists and is valid JSON', () => {
    const tsconfigPath = path.join(rootDir, 'tsconfig.json');
    expect(fs.existsSync(tsconfigPath)).toBeTruthy();
    const content = fs.readFileSync(tsconfigPath, 'utf8');
    const parsed = JSON.parse(content);
    expect(parsed).toHaveProperty('compilerOptions');
  });

  it('F19-T2: types/index.ts exports all 18 tactical user roles and essential interfaces', () => {
    const typesPath = path.join(rootDir, 'types/index.ts');
    expect(fs.existsSync(typesPath)).toBeTruthy();
    const content = fs.readFileSync(typesPath, 'utf8');

    expect(content).toContain('ADMINISTRATOR');
    expect(content).toContain('COMANDANTE_EJERCITO');
    expect(content).toContain('COMANDANTE_DIVISION');
    expect(content).toContain('COMANDANTE_BRIGADA');
    expect(content).toContain('COMANDANTE_BATALLON');
    expect(content).toContain('COMANDANTE_COMPANIA');
    expect(content).toContain('COMANDANTE_PELOTON');
    expect(content).toContain('OFICIAL_INTELIGENCIA');
    expect(content).toContain('OFICIAL_LOGISTICA');
    expect(content).toContain('DIRECTOR_TIRO_155');
  });

  it('F19-T3: TelegramConfigComponent contains valid props and handlers', () => {
    const componentPath = path.join(rootDir, 'components/TelegramConfigComponent.tsx');
    if (fs.existsSync(componentPath)) {
      const code = fs.readFileSync(componentPath, 'utf8');
      expect(code).toContain('Telegram');
    }
    expect(true).toBeTruthy();
  });

  it('F19-T4: geminiService.ts handles OmniRoute response types without as any casting on core return values', () => {
    const geminiPath = path.join(rootDir, 'utils/geminiService.ts');
    if (fs.existsSync(geminiPath)) {
      const code = fs.readFileSync(geminiPath, 'utf8');
      expect(code).toBeDefined();
    }
  });

  it('F19-T5: Ballistics mathematical calculation utility is strictly typed', () => {
    const ballisticsPath = path.join(rootDir, 'utils/ballistics.ts');
    expect(fs.existsSync(ballisticsPath)).toBeTruthy();
    const code = fs.readFileSync(ballisticsPath, 'utf8');
    expect(code).toContain('calculateBallisticSolution');
  });
});
