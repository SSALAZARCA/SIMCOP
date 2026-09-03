import { describe, it, expect } from '../harness/test_framework.js';
import path from 'path';

describe('F06-BND: Path Traversal Fuzzing & Upload Boundaries', () => {
  const allowedExtensions = new Set(['.kml', '.kmz', '.geojson', '.json', '.png', '.jpg', '.jpeg', '.pdf', '.txt']);
  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB limit

  function sanitizeAndValidateFilename(filename, sizeBytes) {
    if (sizeBytes > MAX_FILE_SIZE) {
      return { status: 413, error: 'Payload Too Large: File exceeds 10MB limit' };
    }

    // Decode URL-encoded sequences
    let decoded = filename;
    try {
      decoded = decodeURIComponent(decoded);
    } catch {}

    // Check for null bytes
    if (decoded.includes('\0')) {
      return { status: 400, error: 'Bad Request: Null byte detected in filename' };
    }

    // Check for traversal
    if (decoded.includes('..') || decoded.includes('/') || decoded.includes('\\')) {
      return { status: 400, error: 'Bad Request: Directory traversal character detected' };
    }

    const ext = path.extname(decoded).toLowerCase();
    if (!allowedExtensions.has(ext)) {
      return { status: 400, error: `Bad Request: Disallowed extension ${ext}` };
    }

    return { status: 200, valid: true, cleanName: path.basename(decoded) };
  }

  it('F06-BND-T1: URL-encoded traversal payloads (%2e%2e%2f) are decoded and rejected', () => {
    const res = sanitizeAndValidateFilename('%2e%2e%2fetc%2fpasswd.kml', 1024);
    expect(res.status).toBe(400);
  });

  it('F06-BND-T2: Windows backslash traversal (..\\..\\windows) is rejected', () => {
    const res = sanitizeAndValidateFilename('..\\..\\Windows\\win.ini', 1024);
    expect(res.status).toBe(400);
  });

  it('F06-BND-T3: Null byte extension spoofing (malicious.kml\\0.exe) is detected and blocked', () => {
    const res = sanitizeAndValidateFilename('malicious.kml\0.exe', 1024);
    expect(res.status).toBe(400);
    expect(res.error).toContain('Null byte');
  });

  it('F06-BND-T4: File exceeding 10MB limit (11MB) returns HTTP 413 Payload Too Large', () => {
    const res = sanitizeAndValidateFilename('large_map.kml', 11 * 1024 * 1024);
    expect(res.status).toBe(413);
  });

  it('F06-BND-T5: Double extension disguise (overlay.kml.exe) inspects terminal extension and rejects', () => {
    const res = sanitizeAndValidateFilename('overlay.kml.exe', 1024);
    expect(res.status).toBe(400);
  });
});
