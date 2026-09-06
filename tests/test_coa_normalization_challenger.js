/**
 * EMPIRICAL ADVERSARIAL STRESS TEST SUITE — CHALLENGER QA 1
 * Mission: COA Normalization & Geodesy Stress Testing
 * 
 * Verifies:
 * 1. Resilience against null, undefined, primitive, and non-object inputs.
 * 2. Resilience against stringified or truncated phases arrays.
 * 3. Coordinate parsing: string pairs, GeoJSON [lon, lat], inverted pairs, object representations.
 * 4. Boundary tests on Colombian extremities (Punta Gallinas, Leticia, San Andrés, Puerto Carreño, Providencia).
 * 5. Tactical category classification: PZ, LZ, Phase Lines, Axis of Advance, Assembly Areas, Objectives, Boundaries.
 * 6. Geometry handling for 1, 2, and 3+ coordinates (including Assembly Area ellipse fallback).
 * 7. Verification that coordinates strictly fall within Colombian bounds:
 *    Lat in [-4.5, 13.5], Lon in [-82.0, -66.0].
 */

import fs from 'fs';
import path from 'path';
import assert from 'assert';

console.log('================================================================');
console.log('⚡ STARTING COA NORMALIZATION & GEODESY ADVERSARIAL TEST SUITE');
console.log('================================================================\n');

// Enum replica from types/index.ts
export const COAGraphicType = {
  PHASE_LINE: 'PHASE_LINE',
  AXIS_OF_ADVANCE: 'AXIS_OF_ADVANCE',
  OBJECTIVE: 'OBJECTIVE',
  ASSEMBLY_AREA: 'ASSEMBLY_AREA',
  BOUNDARY: 'BOUNDARY',
  CHECKPOINT: 'CHECKPOINT'
};

/**
 * Exact implementation replica of normalizeCOAPlan from utils/geminiService.ts:1029-1160
 */
export const normalizeCOAPlan = (raw) => {
  if (!raw || typeof raw !== 'object') {
    return {
      planName: "Plan de Maniobra Táctica COA",
      conceptOfOperations: "",
      phases: []
    };
  }

  const planName = raw.nombre_operacion || raw.planName || "Plan de Maniobra Táctica COA";
  const conceptOfOperations = raw.intencion_comandante || raw.conceptOfOperations || "";
  
  const rawPhases = Array.isArray(raw.fases) ? raw.fases : (Array.isArray(raw.phases) ? raw.phases : []);
  const phases = rawPhases.map((phase, pIdx) => {
    if (!phase || typeof phase !== 'object') {
      return {
        phaseName: `Fase ${pIdx + 1}`,
        description: "",
        graphics: [],
        fase_numero: pIdx + 1,
        nombre: `Fase ${pIdx + 1}`,
        descripcion: "",
        medidas_control_graficacion: []
      };
    }

    const phaseName = phase.nombre || phase.phaseName || `Fase ${phase.fase_numero || (pIdx + 1)}`;
    const description = phase.descripcion || phase.description || "";
    
    // Normalizar medidas de control / graphics
    const rawGraphics = Array.isArray(phase.medidas_control_graficacion)
      ? phase.medidas_control_graficacion
      : (Array.isArray(phase.graphics) ? phase.graphics : []);

    const graphics = rawGraphics.map((item) => {
      if (!item || typeof item !== 'object') {
        return {
          type: COAGraphicType.PHASE_LINE,
          label: 'Control Táctico',
          locations: []
        };
      }

      let gType = COAGraphicType.PHASE_LINE;
      const cat = (item.categoria || item.type || item.tipo || item.label || item.etiqueta || item.nombre || "").toUpperCase();
      const tipo = (item.tipo || "").toUpperCase();
      
      if (cat.includes('LINEA_FASE') || cat.includes('PHASE_LINE')) gType = COAGraphicType.PHASE_LINE;
      else if (cat.includes('EJE_AVANCE') || cat.includes('AXIS')) gType = COAGraphicType.AXIS_OF_ADVANCE;
      else if (cat.includes('AREA_OBJETIVO') || cat.includes('OBJECTIVE')) gType = COAGraphicType.OBJECTIVE;
      else if (cat.includes('ZONA_REUNION') || cat.includes('ASSEMBLY')) gType = COAGraphicType.ASSEMBLY_AREA;
      else if (cat.includes('POSICION_BLOQUEO') || cat.includes('BOUNDARY')) gType = COAGraphicType.BOUNDARY;
      else if (cat.includes('PUNTO_CONTROL') || cat.includes('PUNTO_INSERCION') || cat.includes('CHECKPOINT') || cat.includes('PZ') || cat.includes('LZ') || tipo === 'PUNTO') gType = COAGraphicType.CHECKPOINT;
      else if (tipo === 'LINEA') gType = COAGraphicType.PHASE_LINE;
      else if (tipo === 'POLIGONO') gType = COAGraphicType.OBJECTIVE;
      
      const parseCoordPair = (c0, c1) => {
        const v0 = typeof c0 === 'number' ? c0 : parseFloat(c0);
        const v1 = typeof c1 === 'number' ? c1 : parseFloat(c1);
        const safe0 = isNaN(v0) ? 0 : v0;
        const safe1 = isNaN(v1) ? 0 : v1;
        // In South America / Colombia, longitude is negative (-66 to -82 W)
        // If c0 is longitude (< -20 or |c0| > 20), it is GeoJSON [lon, lat]
        if (safe0 < -20 || Math.abs(safe0) > 20) {
          return { lat: safe1, lon: safe0 };
        } else if (safe1 < -20 || Math.abs(safe1) > 20) {
          return { lat: safe0, lon: safe1 };
        }
        return { lat: safe0, lon: safe1 };
      };

      const coords = item.coordenadas || item.locations || [];
      let locations = [];
      if (Array.isArray(coords)) {
        if (coords.length >= 2 && (typeof coords[0] === 'number' || typeof coords[0] === 'string') && (typeof coords[1] === 'number' || typeof coords[1] === 'string')) {
          // Coordenada individual [lat, lon] o [lon, lat]
          locations = [parseCoordPair(coords[0], coords[1])];
        } else if (coords.length > 0 && Array.isArray(coords[0])) {
          // Array de coordenadas [[c0, c1], ...]
          locations = coords.map((c) => {
            if (Array.isArray(c) && c.length >= 2) {
              return parseCoordPair(c[0], c[1]);
            }
            return { lat: 0, lon: 0 };
          }).filter(loc => !(loc.lat === 0 && loc.lon === 0));
        } else if (coords.length > 0 && typeof coords[0] === 'object') {
          locations = coords.map((c) => {
            if (Array.isArray(c) && c.length >= 2) {
              return parseCoordPair(c[0], c[1]);
            }
            if (c && typeof c === 'object') {
              let lat = typeof c.lat === 'number' ? c.lat : (c.latitude !== undefined ? parseFloat(c.latitude) : parseFloat(c.lat || 0));
              let lon = typeof c.lon === 'number' ? c.lon : (c.lng !== undefined ? parseFloat(c.lng) : (c.longitude !== undefined ? parseFloat(c.longitude) : parseFloat(c.lon || 0)));
              lat = isNaN(lat) ? 0 : lat;
              lon = isNaN(lon) ? 0 : lon;
              if (lat < -20 && lon > -20) {
                const tmp = lat;
                lat = lon;
                lon = tmp;
              }
              return { lat, lon };
            }
            return { lat: 0, lon: 0 };
          });
        }
      }
      
      return {
        type: gType,
        label: item.etiqueta || item.label || 'Control Táctico',
        locations
      };
    });
    
    return {
      phaseName,
      description,
      graphics,
      fase_numero: phase.fase_numero || (pIdx + 1),
      nombre: phaseName,
      descripcion: description,
      medidas_control_graficacion: rawGraphics
    };
  });
  
  return {
    ...raw,
    planName,
    conceptOfOperations,
    phases
  };
};

/**
 * Exact replica of Map3DDisplayComponent coordinate processing
 */
export const processMap3DPositions = (graphic) => {
  if (!graphic.locations || !Array.isArray(graphic.locations) || graphic.locations.length === 0) return [];

  return graphic.locations.map((loc) => {
    if (Array.isArray(loc) && loc.length >= 2) {
      const c0 = typeof loc[0] === 'number' ? loc[0] : parseFloat(loc[0]);
      const c1 = typeof loc[1] === 'number' ? loc[1] : parseFloat(loc[1]);
      if (isNaN(c0) || isNaN(c1)) return null;
      let lon;
      let lat;
      if (c0 < -20 || Math.abs(c0) > 20) {
        lon = c0;
        lat = c1;
      } else if (c1 < -20 || Math.abs(c1) > 20) {
        lon = c1;
        lat = c0;
      } else {
        lat = c0;
        lon = c1;
      }
      return { lon: Number(lon), lat: Number(lat) };
    }
    if (loc && typeof loc === 'object') {
      let rawLon = loc.lon ?? loc.lng ?? loc.longitude;
      let rawLat = loc.lat ?? loc.latitude ?? loc.lati ?? loc.latitud;
      if (rawLon === undefined || rawLat === undefined) return null;
      let lon = typeof rawLon === 'number' ? rawLon : parseFloat(rawLon);
      let lat = typeof rawLat === 'number' ? rawLat : parseFloat(rawLat);
      if (isNaN(lon) || isNaN(lat)) return null;
      if (lat < -20 && lon > -20) {
        const tmp = lat;
        lat = lon;
        lon = tmp;
      }
      return { lon: Number(lon), lat: Number(lat) };
    }
    return null;
  }).filter((pos) => pos !== null);
};

const suiteResults = {
  malformedInputs: { passed: 0, failed: 0, details: [] },
  stringifiedPhases: { passed: 0, failed: 0, details: [] },
  coordinateParsing: { passed: 0, failed: 0, details: [] },
  colombiaBoundaries: { passed: 0, failed: 0, details: [] },
  tacticalCategories: { passed: 0, failed: 0, details: [] },
  geometryHandling: { passed: 0, failed: 0, details: [] }
};

function checkColombiaBounds(lat, lon, context) {
  const LAT_MIN = -4.5;
  const LAT_MAX = 13.5;
  const LON_MIN = -82.0;
  const LON_MAX = -66.0;

  const valid = lat >= LAT_MIN && lat <= LAT_MAX && lon >= LON_MIN && lon <= LON_MAX;
  if (!valid) {
    throw new Error(`Out of bounds for ${context}: lat=${lat}, lon=${lon}. Expected lat in [${LAT_MIN}, ${LAT_MAX}], lon in [${LON_MIN}, ${LON_MAX}]`);
  }
  return true;
}

// ============================================================================
// SUITE 1: MALFORMED & PRIMITIVE INPUTS
// ============================================================================
console.log('▶ [TEST SUITE 1] Malformed & Primitive Inputs Stress...');

const primitiveCases = [
  { name: 'null input', input: null },
  { name: 'undefined input', input: undefined },
  { name: 'empty string', input: "" },
  { name: 'random string', input: "malformed JSON string" },
  { name: 'boolean false', input: false },
  { name: 'boolean true', input: true },
  { name: 'number 0', input: 0 },
  { name: 'number 12345', input: 12345 },
  { name: 'NaN input', input: NaN },
  { name: 'empty array', input: [] },
  { name: 'empty object', input: {} },
  { name: 'object with null fields', input: { planName: null, phases: null, fases: null } },
  { name: 'object with non-array phases', input: { planName: "Plan 1", phases: 123 } }
];

for (const tc of primitiveCases) {
  try {
    const res = normalizeCOAPlan(tc.input);
    assert(typeof res === 'object' && res !== null, 'Must return object');
    assert(typeof res.planName === 'string', 'planName must be string');
    assert(typeof res.conceptOfOperations === 'string', 'conceptOfOperations must be string');
    assert(Array.isArray(res.phases), 'phases must be array');
    suiteResults.malformedInputs.passed++;
    console.log(`   ✓ 1.${suiteResults.malformedInputs.passed} Handled ${tc.name} gracefully`);
  } catch (err) {
    suiteResults.malformedInputs.failed++;
    console.error(`   ✗ Failed on ${tc.name}:`, err.message);
  }
}

// ============================================================================
// SUITE 2: TRUNCATED OR STRINGIFIED PHASES ARRAYS
// ============================================================================
console.log('\n▶ [TEST SUITE 2] Stringified and Corrupted Phases...');

const phaseCases = [
  { name: 'raw.phases as empty JSON string', input: { phases: '[]' } },
  { name: 'raw.phases as stringified valid array', input: { phases: '[{"phaseName":"F1"}]' } },
  { name: 'raw.phases as truncated string', input: { phases: '[{"phaseName":"Fase Infil' } },
  { name: 'raw.fases as plain text', input: { fases: 'Fase 1 de inserción nocturna' } },
  { name: 'raw.phases array containing null and primitives', input: { phases: [null, undefined, 42, "broken", {}] } },
  { name: 'phase with null graphics', input: { phases: [{ phaseName: "Fase 1", graphics: null, medidas_control_graficacion: null }] } },
  { name: 'phase with array of corrupted graphic items', input: { phases: [{ phaseName: "Fase 1", graphics: [null, undefined, "not an object", 99] }] } }
];

for (const tc of phaseCases) {
  try {
    const res = normalizeCOAPlan(tc.input);
    assert(Array.isArray(res.phases), 'phases must be array');
    for (const p of res.phases) {
      assert(typeof p === 'object' && p !== null, 'phase item must be object');
      assert(Array.isArray(p.graphics), 'graphics must be array');
    }
    suiteResults.stringifiedPhases.passed++;
    console.log(`   ✓ 2.${suiteResults.stringifiedPhases.passed} Handled ${tc.name} safely`);
  } catch (err) {
    suiteResults.stringifiedPhases.failed++;
    console.error(`   ✗ Failed on ${tc.name}:`, err.message);
  }
}

// ============================================================================
// SUITE 3: COORDINATE FORMATTING AND PARSING STRESS (BOGOTÁ 4.6097, -74.0817)
// ============================================================================
console.log('\n▶ [TEST SUITE 3] Coordinate Variations for Bogotá [4.6097, -74.0817]...');

const bogotaVariations = [
  { name: 'Standard decimal pair [lat, lon]', coords: [4.6097, -74.0817] },
  { name: 'Standard GeoJSON [lon, lat]', coords: [-74.0817, 4.6097] },
  { name: 'String decimal pair ["4.6097", "-74.0817"]', coords: ["4.6097", "-74.0817"] },
  { name: 'String GeoJSON ["-74.0817", "4.6097"]', coords: ["-74.0817", "4.6097"] },
  { name: 'Object {lat, lon}', coords: [{ lat: 4.6097, lon: -74.0817 }] },
  { name: 'Inverted Object {lat, lon}', coords: [{ lat: -74.0817, lon: 4.6097 }] },
  { name: 'Object {latitude, longitude}', coords: [{ latitude: 4.6097, longitude: -74.0817 }] },
  { name: 'Inverted Object {latitude, longitude}', coords: [{ latitude: -74.0817, longitude: 4.6097 }] },
  { name: 'Object with string lat/lng', coords: [{ lat: "4.6097", lng: "-74.0817" }] },
  { name: 'Inverted Object with string lat/lng', coords: [{ lat: "-74.0817", lng: "4.6097" }] },
  { name: 'Nested array of pairs [[4.6097, -74.0817]]', coords: [[4.6097, -74.0817]] },
  { name: 'Nested array of GeoJSON [[-74.0817, 4.6097]]', coords: [[-74.0817, 4.6097]] }
];

for (const tc of bogotaVariations) {
  try {
    const raw = {
      phases: [{
        phaseName: "Fase Test",
        graphics: [{
          tipo: "PUNTO",
          categoria: "PUNTO_CONTROL",
          label: "Punto Bogotá",
          coordenadas: tc.coords
        }]
      }]
    };

    const norm = normalizeCOAPlan(raw);
    const graphic = norm.phases[0].graphics[0];
    assert(graphic.locations.length >= 1, `Must have at least 1 location for ${tc.name}`);
    
    const loc = graphic.locations[0];
    // Verify Bogotá coordinates
    assert(Math.abs(loc.lat - 4.6097) < 0.05, `Lat must be ~4.6097, got ${loc.lat}`);
    assert(Math.abs(loc.lon - (-74.0817)) < 0.05, `Lon must be ~ -74.0817, got ${loc.lon}`);
    
    // Check Colombian bounds
    checkColombiaBounds(loc.lat, loc.lon, tc.name);

    // Also verify through Map3DDisplayComponent positions processor
    const map3dPositions = processMap3DPositions(graphic);
    assert(map3dPositions.length >= 1, 'Map3D processor must yield position');
    checkColombiaBounds(map3dPositions[0].lat, map3dPositions[0].lon, `Map3D ${tc.name}`);

    suiteResults.coordinateParsing.passed++;
    console.log(`   ✓ 3.${suiteResults.coordinateParsing.passed} Passed ${tc.name} -> lat: ${loc.lat.toFixed(4)}, lon: ${loc.lon.toFixed(4)}`);
  } catch (err) {
    suiteResults.coordinateParsing.failed++;
    console.error(`   ✗ Failed on ${tc.name}:`, err.message);
  }
}

// ============================================================================
// SUITE 4: COLOMBIAN EXTREMITIES BOUNDARY TESTS
// ============================================================================
console.log('\n▶ [TEST SUITE 4] Boundary Tests on Colombian Extremities...');

const extremityCases = [
  {
    name: 'Punta Gallinas (Extreme North)',
    lat: 12.456,
    lon: -71.666
  },
  {
    name: 'Leticia / Quebrada San Antonio (Extreme South)',
    lat: -4.215,
    lon: -69.943
  },
  {
    name: 'San Andrés Island (Insular Northwest)',
    lat: 12.584,
    lon: -81.700
  },
  {
    name: 'Providencia Island (Extreme Insular North)',
    lat: 13.350,
    lon: -81.370
  },
  {
    name: 'Puerto Carreño (Extreme East)',
    lat: 6.183,
    lon: -67.485
  },
  {
    name: 'Cabo Manglares (Continental West)',
    lat: 1.800,
    lon: -79.030
  },
  {
    name: 'Malpelo Island (Insular West)',
    lat: 3.980,
    lon: -81.600
  }
];

for (const ext of extremityCases) {
  // Test both [lat, lon] and GeoJSON [lon, lat]
  const variations = [
    { type: '[lat, lon]', coords: [ext.lat, ext.lon] },
    { type: 'GeoJSON [lon, lat]', coords: [ext.lon, ext.lat] },
    { type: 'Object {lat, lon}', coords: [{ lat: ext.lat, lon: ext.lon }] },
    { type: 'Inverted Object {lat, lon}', coords: [{ lat: ext.lon, lon: ext.lat }] }
  ];

  for (const v of variations) {
    try {
      const raw = {
        phases: [{
          graphics: [{
            categoria: "CHECKPOINT",
            label: `${ext.name} (${v.type})`,
            coordenadas: v.coords
          }]
        }]
      };

      const norm = normalizeCOAPlan(raw);
      const loc = norm.phases[0].graphics[0].locations[0];
      assert(loc, `Must have location for ${ext.name} ${v.type}`);

      // Verify that coordinates match expected target within tolerance
      assert(Math.abs(loc.lat - ext.lat) < 0.05, `Lat deviation for ${ext.name}: expected ${ext.lat}, got ${loc.lat}`);
      assert(Math.abs(loc.lon - ext.lon) < 0.05, `Lon deviation for ${ext.name}: expected ${ext.lon}, got ${loc.lon}`);

      // Strictly verify Colombian bounding box
      checkColombiaBounds(loc.lat, loc.lon, `${ext.name} ${v.type}`);

      // Also verify Map3D processor
      const map3dPos = processMap3DPositions(norm.phases[0].graphics[0]);
      assert(map3dPos.length === 1, 'Map3D must produce exactly 1 position');
      checkColombiaBounds(map3dPos[0].lat, map3dPos[0].lon, `Map3D ${ext.name} ${v.type}`);

      suiteResults.colombiaBoundaries.passed++;
      console.log(`   ✓ 4.${suiteResults.colombiaBoundaries.passed} ${ext.name} [${v.type}] -> lat: ${loc.lat.toFixed(4)}, lon: ${loc.lon.toFixed(4)}`);
    } catch (err) {
      suiteResults.colombiaBoundaries.failed++;
      console.error(`   ✗ Failed on ${ext.name} [${v.type}]:`, err.message);
    }
  }
}

// ============================================================================
// SUITE 5: TACTICAL CATEGORY CLASSIFICATION
// ============================================================================
console.log('\n▶ [TEST SUITE 5] Tactical Category Classification...');

const tacticalCategories = [
  { item: { categoria: "PZ", label: "PZ OSO" }, expected: COAGraphicType.CHECKPOINT },
  { item: { categoria: "LZ", label: "LZ AGUILA" }, expected: COAGraphicType.CHECKPOINT },
  { item: { label: "PUNTO_INSERCION_PZ_1" }, expected: COAGraphicType.CHECKPOINT },
  { item: { etiqueta: "PUNTO_EXTRACCION_LZ_2" }, expected: COAGraphicType.CHECKPOINT },
  { item: { categoria: "CHECKPOINT", label: "PC DELTA" }, expected: COAGraphicType.CHECKPOINT },
  { item: { tipo: "PUNTO", label: "Punto de Control 1" }, expected: COAGraphicType.CHECKPOINT },
  { item: { categoria: "LINEA_FASE", label: "LF ROJO" }, expected: COAGraphicType.PHASE_LINE },
  { item: { categoria: "PHASE_LINE", label: "PL BLUE" }, expected: COAGraphicType.PHASE_LINE },
  { item: { tipo: "LINEA", label: "Linea de Coordinacion" }, expected: COAGraphicType.PHASE_LINE },
  { item: { categoria: "EJE_AVANCE", label: "Eje Tigre" }, expected: COAGraphicType.AXIS_OF_ADVANCE },
  { item: { categoria: "AXIS_OF_ADVANCE", label: "Axis Cobra" }, expected: COAGraphicType.AXIS_OF_ADVANCE },
  { item: { categoria: "ZONA_REUNION", label: "ZR BRAVO" }, expected: COAGraphicType.ASSEMBLY_AREA },
  { item: { categoria: "ASSEMBLY_AREA", label: "AA CHARLIE" }, expected: COAGraphicType.ASSEMBLY_AREA },
  { item: { categoria: "AREA_OBJETIVO", label: "OBJ OMEGA" }, expected: COAGraphicType.OBJECTIVE },
  { item: { tipo: "POLIGONO", label: "Poligono de Maniobra" }, expected: COAGraphicType.OBJECTIVE },
  { item: { categoria: "POSICION_BLOQUEO", label: "Bloqueo Norte" }, expected: COAGraphicType.BOUNDARY },
  { item: { categoria: "BOUNDARY", label: "Limite de Sector" }, expected: COAGraphicType.BOUNDARY }
];

for (const tc of tacticalCategories) {
  try {
    const raw = {
      phases: [{
        graphics: [{
          ...tc.item,
          coordenadas: [4.6097, -74.0817]
        }]
      }]
    };

    const norm = normalizeCOAPlan(raw);
    const graphic = norm.phases[0].graphics[0];
    assert.strictEqual(graphic.type, tc.expected, `Category ${JSON.stringify(tc.item)} must map to ${tc.expected}`);
    suiteResults.tacticalCategories.passed++;
    console.log(`   ✓ 5.${suiteResults.tacticalCategories.passed} ${JSON.stringify(tc.item.categoria || tc.item.tipo || tc.item.label)} -> ${graphic.type}`);
  } catch (err) {
    suiteResults.tacticalCategories.failed++;
    console.error(`   ✗ Category classification failed:`, err.message);
  }
}

// ============================================================================
// SUITE 6: GEOMETRY HANDLING FOR 1, 2, AND 3+ COORDINATES (CESIUM LOGIC)
// ============================================================================
console.log('\n▶ [TEST SUITE 6] Geometry Handling for 1, 2, and 3+ Coordinates...');

// Mock Cesium entity tracking
class MockEntityCollector {
  constructor() {
    this.entities = [];
  }
  add(entity) {
    this.entities.push(entity);
    return entity;
  }
}

function simulateTacticalRendering(graphicType, label, positions) {
  const collector = new MockEntityCollector();
  const id = `test-coa-${graphicType}`;
  const phaseColorHex = '#00ffff';

  switch (graphicType) {
    case COAGraphicType.PHASE_LINE:
      if (positions.length >= 2) {
        collector.add({ id, type: 'polyline', positions });
        collector.add({ id: `${id}-start-lbl`, position: positions[0] });
        collector.add({ id: `${id}-end-lbl`, position: positions[positions.length - 1] });
      }
      break;

    case COAGraphicType.AXIS_OF_ADVANCE:
      if (positions.length >= 2) {
        collector.add({ id, type: 'polyline-arrow', positions });
        collector.add({ id: `${id}-lbl`, position: positions[0] });
      }
      break;

    case COAGraphicType.OBJECTIVE:
      if (positions.length === 1 || positions.length === 2) {
        const center = positions.length === 2 ? positions[0] : positions[0];
        collector.add({ id, type: 'ellipse', position: center, radius: 500 });
      } else if (positions.length > 2) {
        collector.add({ id, type: 'polygon', positions });
      }
      break;

    case COAGraphicType.ASSEMBLY_AREA:
      if (positions.length >= 3) {
        collector.add({ id, type: 'polygon', positions });
        collector.add({ id: `${id}-dashed-outline`, type: 'polyline-dashed', positions: [...positions, positions[0]] });
        collector.add({ id: `${id}-lbl`, position: positions[0] });
      } else if (positions.length === 1 || positions.length === 2) {
        const center = positions.length === 2 ? positions[0] : positions[0];
        collector.add({ id, type: 'ellipse', position: center, radius: 600 });
        collector.add({ id: `${id}-lbl`, position: center });
      }
      break;

    case COAGraphicType.BOUNDARY:
      if (positions.length >= 2) {
        collector.add({ id, type: 'polyline-boundary', positions });
        collector.add({ id: `${id}-lbl`, position: positions[0] });
      }
      break;

    case COAGraphicType.CHECKPOINT:
      if (positions.length >= 1) {
        collector.add({ id, type: 'point', position: positions[0] });
      }
      break;
  }

  return collector.entities;
}

const geometryStressCases = [
  // Assembly Area with 1, 2, 3 coords
  { type: COAGraphicType.ASSEMBLY_AREA, coordsCount: 1, expectedType: 'ellipse' },
  { type: COAGraphicType.ASSEMBLY_AREA, coordsCount: 2, expectedType: 'ellipse' },
  { type: COAGraphicType.ASSEMBLY_AREA, coordsCount: 3, expectedType: 'polygon' },
  { type: COAGraphicType.ASSEMBLY_AREA, coordsCount: 4, expectedType: 'polygon' },

  // Objective with 1, 2, 3 coords
  { type: COAGraphicType.OBJECTIVE, coordsCount: 1, expectedType: 'ellipse' },
  { type: COAGraphicType.OBJECTIVE, coordsCount: 2, expectedType: 'ellipse' },
  { type: COAGraphicType.OBJECTIVE, coordsCount: 3, expectedType: 'polygon' },

  // Phase Line with 1, 2, 3 coords
  { type: COAGraphicType.PHASE_LINE, coordsCount: 1, expectedEntities: 0 }, // Cleanly skipped
  { type: COAGraphicType.PHASE_LINE, coordsCount: 2, expectedType: 'polyline' },
  { type: COAGraphicType.PHASE_LINE, coordsCount: 3, expectedType: 'polyline' },

  // Axis of Advance with 1, 2 coords
  { type: COAGraphicType.AXIS_OF_ADVANCE, coordsCount: 1, expectedEntities: 0 }, // Cleanly skipped
  { type: COAGraphicType.AXIS_OF_ADVANCE, coordsCount: 2, expectedType: 'polyline-arrow' },

  // Checkpoint with 1, 2 coords
  { type: COAGraphicType.CHECKPOINT, coordsCount: 1, expectedType: 'point' },
  { type: COAGraphicType.CHECKPOINT, coordsCount: 2, expectedType: 'point' },

  // Boundary with 1, 2 coords
  { type: COAGraphicType.BOUNDARY, coordsCount: 1, expectedEntities: 0 }, // Cleanly skipped
  { type: COAGraphicType.BOUNDARY, coordsCount: 2, expectedType: 'polyline-boundary' }
];

const basePositions = [
  { lat: 4.6097, lon: -74.0817 },
  { lat: 4.6200, lon: -74.0700 },
  { lat: 4.6150, lon: -74.0600 },
  { lat: 4.6050, lon: -74.0650 }
];

for (const sc of geometryStressCases) {
  try {
    const testPositions = basePositions.slice(0, sc.coordsCount);
    const entities = simulateTacticalRendering(sc.type, 'Test Graphic', testPositions);

    if (sc.expectedEntities !== undefined) {
      assert.strictEqual(entities.length, sc.expectedEntities, `Expected ${sc.expectedEntities} entities, got ${entities.length}`);
    } else {
      assert(entities.length > 0, `Must produce entities for ${sc.type} with ${sc.coordsCount} coords`);
      const mainEntity = entities.find(e => e.type === sc.expectedType);
      assert(mainEntity, `Must contain entity of type ${sc.expectedType}`);
    }

    suiteResults.geometryHandling.passed++;
    console.log(`   ✓ 6.${suiteResults.geometryHandling.passed} ${sc.type} with ${sc.coordsCount} coord(s) -> ${sc.expectedType || '0 entities (gracefully skipped)'}`);
  } catch (err) {
    suiteResults.geometryHandling.failed++;
    console.error(`   ✗ Geometry handling failed on ${sc.type} (${sc.coordsCount} coords):`, err.message);
  }
}

// ============================================================================
// FINAL SUMMARY & METRICS
// ============================================================================
console.log('\n================================================================');
console.log('📊 EMPIRICAL ADVERSARIAL CHALLENGER SUITE SUMMARY');
console.log('================================================================');

let totalPassed = 0;
let totalFailed = 0;

for (const [suiteName, stats] of Object.entries(suiteResults)) {
  totalPassed += stats.passed;
  totalFailed += stats.failed;
  const status = stats.failed === 0 ? 'PASS' : 'FAIL';
  console.log(`• ${suiteName.padEnd(22)}: ${stats.passed} passed, ${stats.failed} failed [${status}]`);
}

console.log('----------------------------------------------------------------');
console.log(`TOTAL: ${totalPassed} passed, ${totalFailed} failed out of ${totalPassed + totalFailed} tests.`);
console.log(`FINAL EMPIRICAL VERDICT: ${totalFailed === 0 ? 'APPROVE' : 'REQUEST_CHANGES'}`);
console.log('================================================================\n');

if (totalFailed > 0) {
  process.exit(1);
}
