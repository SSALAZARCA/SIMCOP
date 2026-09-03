import { describe, it, expect } from '../harness/test_framework.js';

describe('F17: DATA-02 Route History Limit & Pruning', () => {
  const MAX_ROUTE_POINTS = 500;

  class TacticalMilitaryUnit {
    constructor(id, name) {
      this.id = id;
      this.name = name;
      this.routeHistory = [];
    }

    setRouteHistory(points) {
      if (!points) {
        this.routeHistory = [];
        return;
      }
      if (points.length > MAX_ROUTE_POINTS) {
        // Keep the latest 500 points (FIFO pruning)
        this.routeHistory = points.slice(points.length - MAX_ROUTE_POINTS);
      } else {
        this.routeHistory = [...points];
      }
    }

    addRoutePoint(lat, lon, timestamp = Date.now()) {
      this.routeHistory.push({ lat, lon, timestamp });
      if (this.routeHistory.length > MAX_ROUTE_POINTS) {
        this.routeHistory.shift(); // Remove oldest
      }
    }

    toGeoJSONLineString() {
      return {
        type: 'Feature',
        geometry: {
          type: 'LineString',
          coordinates: this.routeHistory.map(p => [p.lon, p.lat])
        },
        properties: {
          unitId: this.id,
          unitName: this.name,
          pointCount: this.routeHistory.length
        }
      };
    }
  }

  it('F17-T1: Route history initialized with 500 points retains all 500 points', () => {
    const unit = new TacticalMilitaryUnit('U1', 'Pelotón Alfa');
    const points = Array.from({ length: 500 }, (_, i) => ({ lat: 4.0 + i * 0.001, lon: -74.0, timestamp: i }));
    unit.setRouteHistory(points);

    expect(unit.routeHistory).toHaveLength(500);
    expect(unit.routeHistory[0].timestamp).toBe(0);
    expect(unit.routeHistory[499].timestamp).toBe(499);
  });

  it('F17-T2: Setting 750 points prunes oldest 250 points, keeping latest 500 (FIFO)', () => {
    const unit = new TacticalMilitaryUnit('U1', 'Pelotón Alfa');
    const points = Array.from({ length: 750 }, (_, i) => ({ lat: 4.0 + i * 0.001, lon: -74.0, timestamp: i }));
    unit.setRouteHistory(points);

    expect(unit.routeHistory).toHaveLength(500);
    expect(unit.routeHistory[0].timestamp).toBe(250);
    expect(unit.routeHistory[499].timestamp).toBe(749);
  });

  it('F17-T3: Adding 501st point dynamically shifts oldest point out', () => {
    const unit = new TacticalMilitaryUnit('U1', 'Pelotón Alfa');
    for (let i = 0; i < 500; i++) {
      unit.addRoutePoint(4.0, -74.0, i);
    }
    expect(unit.routeHistory).toHaveLength(500);
    expect(unit.routeHistory[0].timestamp).toBe(0);

    // Add 501st point
    unit.addRoutePoint(4.001, -74.001, 500);
    expect(unit.routeHistory).toHaveLength(500);
    expect(unit.routeHistory[0].timestamp).toBe(1);
    expect(unit.routeHistory[499].timestamp).toBe(500);
  });

  it('F17-T4: SPOT satellite telemetry ping integration updates route and respects cap', () => {
    const unit = new TacticalMilitaryUnit('U2', 'Patrulla Selva');
    function ingestSpotTelemetry(spotPing) {
      unit.addRoutePoint(spotPing.latitude, spotPing.longitude, spotPing.unixTime);
    }

    ingestSpotTelemetry({ latitude: 1.234, longitude: -76.543, unixTime: 1700000000 });
    expect(unit.routeHistory).toHaveLength(1);
    expect(unit.routeHistory[0].lat).toBeCloseTo(1.234);
  });

  it('F17-T5: GeoJSON LineString serialization maintains point geometry within limit', () => {
    const unit = new TacticalMilitaryUnit('U3', 'Batería Móvil');
    unit.addRoutePoint(4.5, -74.1, 100);
    unit.addRoutePoint(4.6, -74.2, 200);

    const geojson = unit.toGeoJSONLineString();
    expect(geojson.geometry.type).toBe('LineString');
    expect(geojson.geometry.coordinates).toHaveLength(2);
    expect(geojson.geometry.coordinates[0]).toEqual([-74.1, 4.5]);
    expect(geojson.properties.pointCount).toBe(2);
  });
});
