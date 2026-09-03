import { describe, it, expect } from '../harness/test_framework.js';

describe('F17-BND: Route History Telemetry Overflow & Coordinate Boundaries', () => {
  const MAX_CAP = 500;

  function validateAndIngestPoint(routeHistory, lat, lon, timestamp = Date.now()) {
    // Validate coordinate boundaries
    if (typeof lat !== 'number' || typeof lon !== 'number' || isNaN(lat) || isNaN(lon)) {
      return { status: 400, error: 'Invalid coordinate numeric type' };
    }
    if (lat < -90 || lat > 90 || lon < -180 || lon > 180) {
      return { status: 400, error: 'Coordinate out of valid WGS84 range' };
    }

    // Deduplicate consecutive identical points
    if (routeHistory.length > 0) {
      const last = routeHistory[routeHistory.length - 1];
      if (Math.abs(last.lat - lat) < 0.000001 && Math.abs(last.lon - lon) < 0.000001) {
        return { status: 200, deduplicated: true, size: routeHistory.length };
      }
    }

    routeHistory.push({ lat, lon, timestamp });
    if (routeHistory.length > MAX_CAP) {
      routeHistory.shift();
    }
    return { status: 200, deduplicated: false, size: routeHistory.length };
  }

  it('F17-BND-T1: Out of bounds latitude (> 90 or < -90) is rejected with HTTP 400', () => {
    const history = [];
    expect(validateAndIngestPoint(history, 95.0, -74.0).status).toBe(400);
    expect(validateAndIngestPoint(history, -91.0, -74.0).status).toBe(400);
  });

  it('F17-BND-T2: Out of bounds longitude (> 180 or < -180) is rejected with HTTP 400', () => {
    const history = [];
    expect(validateAndIngestPoint(history, 4.0, 185.0).status).toBe(400);
    expect(validateAndIngestPoint(history, 4.0, -195.0).status).toBe(400);
  });

  it('F17-BND-T3: NaN or null coordinates are rejected with HTTP 400', () => {
    const history = [];
    expect(validateAndIngestPoint(history, NaN, -74.0).status).toBe(400);
    expect(validateAndIngestPoint(history, null, -74.0).status).toBe(400);
  });

  it('F17-BND-T4: High-frequency telemetry stream of 1,000 pings never exceeds 500 points', () => {
    const history = [];
    for (let i = 0; i < 1000; i++) {
      validateAndIngestPoint(history, 4.0 + i * 0.0001, -74.0 + i * 0.0001, i);
    }
    expect(history).toHaveLength(500);
    expect(history[499].timestamp).toBe(999);
    expect(history[0].timestamp).toBe(500);
  });

  it('F17-BND-T5: Consecutive duplicate pings are deduplicated without consuming history slots', () => {
    const history = [];
    validateAndIngestPoint(history, 4.5, -74.1, 100);
    const resDupe = validateAndIngestPoint(history, 4.5, -74.1, 101);

    expect(resDupe.deduplicated).toBeTruthy();
    expect(history).toHaveLength(1);
  });
});
