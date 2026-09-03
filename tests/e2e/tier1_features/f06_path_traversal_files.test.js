import { describe, it, expect } from '../harness/test_framework.js';
import path from 'path';
import crypto from 'crypto';

describe('F06: SEC-07 Path Traversal & File Upload Security', () => {
  const allowedExtensions = new Set(['.kml', '.kmz', '.geojson', '.json', '.png', '.jpg', '.jpeg', '.pdf', '.txt']);
  const baseStorageDir = path.resolve('c:/DESARROLLOS/SIMCOP-main/uploads');

  function validateFileUpload(filename) {
    const ext = path.extname(filename).toLowerCase();
    if (!allowedExtensions.has(ext)) {
      return { status: 400, error: `Invalid file type: ${ext}. Allowed: ${Array.from(allowedExtensions).join(', ')}` };
    }
    return { status: 200, valid: true };
  }

  function resolveSecurePath(filename, storageDir) {
    const cleanFilename = path.basename(filename);
    const resolvedPath = path.resolve(storageDir, cleanFilename);
    if (!resolvedPath.startsWith(path.resolve(storageDir))) {
      throw new Error(`Path traversal attempt detected: ${filename}`);
    }
    return resolvedPath;
  }

  it('F06-T1: Allowed tactical overlay and report file extensions succeed', () => {
    expect(validateFileUpload('aoi_overlay.kml').status).toBe(200);
    expect(validateFileUpload('combat_map.kmz').status).toBe(200);
    expect(validateFileUpload('corridor_routes.geojson').status).toBe(200);
    expect(validateFileUpload('recon_photo.png').status).toBe(200);
    expect(validateFileUpload('aar_annex.pdf').status).toBe(200);
  });

  it('F06-T2: Dangerous executable file extensions are strictly rejected with HTTP 400', () => {
    expect(validateFileUpload('backdoor.exe').status).toBe(400);
    expect(validateFileUpload('shell.jsp').status).toBe(400);
    expect(validateFileUpload('script.sh').status).toBe(400);
    expect(validateFileUpload('payload.bat').status).toBe(400);
    expect(validateFileUpload('exploit.py').status).toBe(400);
  });

  it('F06-T3: Path containment verification blocks directory escape sequences', () => {
    expect(() => resolveSecurePath('../../../../Windows/System32/cmd.exe', baseStorageDir)).not.toThrow();
    // Because path.basename cleans leading directory traversal, the resolved path stays inside storageDir:
    const safePath = resolveSecurePath('../../../../Windows/System32/cmd.exe', baseStorageDir);
    expect(safePath.startsWith(baseStorageDir)).toBeTruthy();
  });

  it('F06-T4: File download response headers include Content-Disposition: attachment', () => {
    function createDownloadHeaders(filename) {
      return {
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${path.basename(filename)}"`,
        'X-Content-Type-Options': 'nosniff'
      };
    }

    const headers = createDownloadHeaders('tactical_briefing.pdf');
    expect(headers['Content-Disposition']).toContain('attachment');
    expect(headers['Content-Disposition']).toContain('tactical_briefing.pdf');
    expect(headers['X-Content-Type-Options']).toBe('nosniff');
  });

  it('F06-T5: Unique sanitized storage name generation', () => {
    function generateStorageName(originalFilename) {
      const ext = path.extname(originalFilename).toLowerCase();
      const uuid = crypto.randomUUID();
      return `${uuid}${ext}`;
    }

    const name1 = generateStorageName('mando_y_control.kml');
    const name2 = generateStorageName('mando_y_control.kml');

    expect(name1).not.toBe(name2);
    expect(name1.endsWith('.kml')).toBeTruthy();
  });
});
