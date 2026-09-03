import { describe, it, expect } from '../harness/test_framework.js';

describe('Pairwise 6: SPOT Satellite Webhook + Route History Pruning + GeoJSON LineString', () => {
  const MAX_HISTORY = 500;

  class UnitTrackerService {
    constructor() {
      this.unit = {
        id: 'U-CONDOR-1',
        name: 'Pelotón Cóndor 1',
        currentPosition: { lat: 4.6097, lon: -74.0817 },
        routeHistory: []
      };
    }

    handleSpotWebhook(webhookSecret, expectedSecret, spotPayload) {
      if (webhookSecret !== expectedSecret) {
        return { status: 401, error: 'Unauthorized webhook ping' };
      }

      const lat = parseFloat(spotPayload.latitude);
      const lon = parseFloat(spotPayload.longitude);
      const unixTime = parseInt(spotPayload.unixTime, 10) || Date.now();

      this.unit.currentPosition = { lat, lon };
      this.unit.routeHistory.push({ lat, lon, unixTime });

      if (this.unit.routeHistory.length > MAX_HISTORY) {
        this.unit.routeHistory.shift(); // FIFO pruning
      }

      return {
        status: 200,
        unitId: this.unit.id,
        currentPos: this.unit.currentPosition,
        historySize: this.unit.routeHistory.length
      };
    }

    getGeoJSONTrack() {
      return {
        type: 'Feature',
        geometry: {
          type: 'LineString',
          coordinates: this.unit.routeHistory.map(p => [p.lon, p.lat])
        },
        properties: {
          unitId: this.unit.id,
          unitName: this.unit.name,
          points: this.unit.routeHistory.length
        }
      };
    }
  }

  it('Pairwise-6.1: Valid SPOT satellite ping updates unit position and records route history', () => {
    const tracker = new UnitTrackerService();
    const res = tracker.handleSpotWebhook('VALID_SECRET', 'VALID_SECRET', {
      latitude: '4.6150',
      longitude: '-74.0850',
      unixTime: 1700000000
    });

    expect(res.status).toBe(200);
    expect(res.currentPos.lat).toBeCloseTo(4.6150);
    expect(res.historySize).toBe(1);
  });

  it('Pairwise-6.2: 600 consecutive satellite telemetry pings maintain strict 500 point cap', () => {
    const tracker = new UnitTrackerService();
    for (let i = 0; i < 600; i++) {
      tracker.handleSpotWebhook('VALID_SECRET', 'VALID_SECRET', {
        latitude: (4.0 + i * 0.001).toFixed(4),
        longitude: '-74.0000',
        unixTime: 1700000000 + i * 60
      });
    }

    expect(tracker.unit.routeHistory).toHaveLength(500);
    expect(tracker.unit.routeHistory[499].unixTime).toBe(1700000000 + 599 * 60);
    expect(tracker.unit.routeHistory[0].unixTime).toBe(1700000000 + 100 * 60);
  });

  it('Pairwise-6.3: Exported GeoJSON LineString accurately reflects the capped 500 track vertices', () => {
    const tracker = new UnitTrackerService();
    for (let i = 0; i < 550; i++) {
      tracker.handleSpotWebhook('VALID_SECRET', 'VALID_SECRET', {
        latitude: '4.5000',
        longitude: '-74.1000',
        unixTime: i
      });
    }

    const geojson = tracker.getGeoJSONTrack();
    expect(geojson.geometry.type).toBe('LineString');
    expect(geojson.geometry.coordinates).toHaveLength(500);
    expect(geojson.properties.points).toBe(500);
  });
});
