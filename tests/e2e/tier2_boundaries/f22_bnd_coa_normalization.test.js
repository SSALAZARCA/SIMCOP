import { describe, it, expect } from '../harness/test_framework.js';

describe('F22-BND: COA Normalization & Geodesic Disambiguation Stress', () => {
  const COAGraphicType = {
    PHASE_LINE: 'PHASE_LINE',
    AXIS_OF_ADVANCE: 'AXIS_OF_ADVANCE',
    OBJECTIVE: 'OBJECTIVE',
    ASSEMBLY_AREA: 'ASSEMBLY_AREA',
    BOUNDARY: 'BOUNDARY',
    CHECKPOINT: 'CHECKPOINT'
  };

  const normalizeCOAPlan = (raw) => {
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
            locations = [parseCoordPair(coords[0], coords[1])];
          } else if (coords.length > 0 && Array.isArray(coords[0])) {
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

  const isWithinColombia = (lat, lon) => {
    return lat >= -4.5 && lat <= 13.5 && lon >= -82.0 && lon <= -66.0;
  };

  it('F22-BND-T1: Handled primitive, null, undefined and boolean inputs without throwing exceptions', () => {
    const cases = [null, undefined, "", "corrupted JSON", true, false, 0, 12345, NaN, [], {}];
    for (const c of cases) {
      const res = normalizeCOAPlan(c);
      expect(typeof res).toBe('object');
      expect(Array.isArray(res.phases)).toBe(true);
    }
  });

  it('F22-BND-T2: Handled stringified or truncated phases without throwing exceptions', () => {
    const cases = [
      { phases: '[]' },
      { phases: '[{"phaseName":"F1"}]' },
      { phases: '[{"phaseName":"Fase Infil' },
      { fases: 'plain text phases' },
      { phases: [null, undefined, 42, {}] }
    ];
    for (const c of cases) {
      const res = normalizeCOAPlan(c);
      expect(Array.isArray(res.phases)).toBe(true);
    }
  });

  it('F22-BND-T3: Correctly disambiguates Bogotá coordinates across all string, GeoJSON and object formats', () => {
    const variations = [
      [4.6097, -74.0817],
      [-74.0817, 4.6097],
      ["4.6097", "-74.0817"],
      ["-74.0817", "4.6097"],
      [{ lat: 4.6097, lon: -74.0817 }],
      [{ lat: -74.0817, lon: 4.6097 }],
      [{ latitude: 4.6097, longitude: -74.0817 }],
      [{ latitude: -74.0817, longitude: 4.6097 }],
      [{ lat: "4.6097", lng: "-74.0817" }],
      [{ lat: "-74.0817", lng: "4.6097" }]
    ];

    for (const v of variations) {
      const plan = normalizeCOAPlan({
        phases: [{
          graphics: [{ categoria: "CHECKPOINT", coordenadas: v }]
        }]
      });
      const loc = plan.phases[0].graphics[0].locations[0];
      expect(isWithinColombia(loc.lat, loc.lon)).toBe(true);
      expect(Math.abs(loc.lat - 4.6097) < 0.05).toBe(true);
      expect(Math.abs(loc.lon - (-74.0817)) < 0.05).toBe(true);
    }
  });

  it('F22-BND-T4: Strictly preserves boundaries for Colombian extremities (Punta Gallinas, Leticia, San Andrés, Providencia, Puerto Carreño)', () => {
    const extremities = [
      { name: 'Punta Gallinas', lat: 12.456, lon: -71.666 },
      { name: 'Leticia', lat: -4.215, lon: -69.943 },
      { name: 'San Andrés', lat: 12.584, lon: -81.700 },
      { name: 'Providencia', lat: 13.350, lon: -81.370 },
      { name: 'Puerto Carreño', lat: 6.183, lon: -67.485 }
    ];

    for (const ext of extremities) {
      for (const coords of [[ext.lat, ext.lon], [ext.lon, ext.lat]]) {
        const plan = normalizeCOAPlan({
          phases: [{
            graphics: [{ categoria: "CHECKPOINT", coordenadas: coords }]
          }]
        });
        const loc = plan.phases[0].graphics[0].locations[0];
        expect(isWithinColombia(loc.lat, loc.lon)).toBe(true);
      }
    }
  });

  it('F22-BND-T5: Accurately maps tactical categories: PZ, LZ, Phase Lines, Axis of Advance, Assembly Areas', () => {
    const categories = [
      { cat: "PZ", expected: COAGraphicType.CHECKPOINT },
      { cat: "LZ", expected: COAGraphicType.CHECKPOINT },
      { cat: "PUNTO_INSERCION_PZ_1", expected: COAGraphicType.CHECKPOINT },
      { cat: "PUNTO_EXTRACCION_LZ_2", expected: COAGraphicType.CHECKPOINT },
      { cat: "LINEA_FASE", expected: COAGraphicType.PHASE_LINE },
      { cat: "EJE_AVANCE", expected: COAGraphicType.AXIS_OF_ADVANCE },
      { cat: "ZONA_REUNION", expected: COAGraphicType.ASSEMBLY_AREA },
      { cat: "AREA_OBJETIVO", expected: COAGraphicType.OBJECTIVE },
      { cat: "POSICION_BLOQUEO", expected: COAGraphicType.BOUNDARY }
    ];

    for (const c of categories) {
      const plan = normalizeCOAPlan({
        phases: [{
          graphics: [{ categoria: c.cat, coordenadas: [4.6, -74.0] }]
        }]
      });
      expect(plan.phases[0].graphics[0].type).toBe(c.expected);
    }
  });
});
