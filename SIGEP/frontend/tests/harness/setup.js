/**
 * SIGEP Tactical Test Harness Setup
 * Provides browser storage mocks, esbuild TS/TSX compilation/bundling, and test utilities.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootFrontendDir = path.resolve(__dirname, '../../');

// Load esbuild
let esbuild;
try {
  esbuild = await import('esbuild');
} catch {
  const simcopEsbuildPath = 'c:/DESARROLLOS/SIMCOP-main/node_modules/esbuild/lib/main.js';
  esbuild = await import(simcopEsbuildPath);
}

/**
 * In-memory Storage Mock
 */
export class MockStorage {
  constructor() {
    this.store = new Map();
  }
  getItem(key) {
    return this.store.has(key) ? this.store.get(key) : null;
  }
  setItem(key, value) {
    this.store.set(key, String(value));
  }
  removeItem(key) {
    this.store.delete(key);
  }
  clear() {
    this.store.clear();
  }
  get length() {
    return this.store.size;
  }
  key(index) {
    return Array.from(this.store.keys())[index] || null;
  }
}

// Polyfill global browser storage if not already defined
if (!globalThis.localStorage) {
  globalThis.localStorage = new MockStorage();
}
if (!globalThis.sessionStorage) {
  globalThis.sessionStorage = new MockStorage();
}
if (!globalThis.window) {
  globalThis.window = globalThis;
}

/**
 * Transpiles and loads a TypeScript or TSX file using esbuild bundling
 * @param {string} relativePath - Path relative to SIGEP/frontend
 * @param {Record<string, string>} [customDefines]
 * @returns {Promise<any>}
 */
export async function loadTsModule(relativePath, customDefines = {}) {
  const absPath = path.resolve(rootFrontendDir, relativePath);

  const cacheDir = path.resolve(__dirname, '../.cache');
  if (!fs.existsSync(cacheDir)) {
    fs.mkdirSync(cacheDir, { recursive: true });
  }

  const safeName = relativePath.replace(/[/\\:.]/g, '_') + '.mjs';
  const outPath = path.resolve(cacheDir, safeName);

  esbuild.buildSync({
    entryPoints: [absPath],
    bundle: true,
    platform: 'node',
    format: 'esm',
    packages: 'external',
    outfile: outPath,
    jsx: 'transform',
    target: 'es2022',
    define: {
      'import.meta.env': JSON.stringify({
        DEV: true,
        VITE_SIMCOP_API_URL: 'http://localhost:8080/api',
        VITE_SIGEP_API_URL: 'http://localhost:4000/api',
        ...customDefines
      })
    }
  });

  const fileUrl = new URL(`file://${outPath.replace(/\\/g, '/')}`).href;
  return await import(fileUrl);
}
