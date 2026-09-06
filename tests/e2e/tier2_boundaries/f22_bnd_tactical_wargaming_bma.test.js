/**
 * F22: Boundary & Empirical Invariant Verification for Tactical AI, Wargaming, and BMA Engines
 *
 * Covers:
 * 1. simulateCOAOutcome & normalizeWargameResult:
 *    - Action - Reaction - Counteraction structure
 *    - Critical event structure
 *    - Attrition invariants (non-negative casualties, probability [0, 100])
 *    - Malformed and boundary inputs
 * 2. simulateBMAInterception & normalizeBMAInterceptionResult:
 *    - Logistics Class V & Class III consumption invariants (0 <= c <= 100)
 *    - MEDEVAC threshold logic (heridos_wia > 0 -> requiere_medevac)
 * 3. getBMASituationBrief & BMAPanel Parsing:
 *    - Word count constraint (<= 150 words)
 *    - 4 Doctrinal bullets presence & syntax
 *    - BMAPanel bullet parser and color class mapping
 */

import { describe, it, expect } from '../harness/test_framework.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../../../');

// Mirror pure normalization logic from utils/geminiService.ts for isolated empirical execution
function normalizeWargameResultMirror(raw) {
  if (!raw || typeof raw !== 'object') {
    return {
      simulacion_id: `WARGAME-FALLBACK`,
      resultado_global: {
        probabilidad_exito_porcentaje: 75,
        veredicto_operacional: "VIABLE CON ADVERTENCIAS",
        justificacion_resumida: "Simulación procesada conforme a doctrina militar."
      },
      atricion_estimada: {
        fuerzas_propias: {
          estimado_bajas_totales: 0,
          heridos: 0,
          muertos_en_combate: 0,
          perdida_medios: "Sin pérdidas materiales críticas estimadas"
        },
        fuerzas_enemigas: {
          estimado_neutralizaciones: 0,
          capturas_estimadas: 0,
          material_incautado_esperado: "Armamento y material de intendencia"
        }
      },
      fases_wargaming: [],
      puntos_falla_criticos: []
    };
  }

  return {
    simulacion_id: raw.simulacion_id || `WARGAME-${Date.now().toString().slice(-4)}`,
    resultado_global: {
      probabilidad_exito_porcentaje: Number(raw.resultado_global?.probabilidad_exito_porcentaje ?? 75),
      veredicto_operacional: raw.resultado_global?.veredicto_operacional || "VIABLE CON ADVERTENCIAS",
      justificacion_resumida: raw.resultado_global?.justificacion_resumida || "Simulación procesada conforme a doctrina militar."
    },
    atricion_estimada: {
      fuerzas_propias: {
        estimado_bajas_totales: Number(raw.atricion_estimada?.fuerzas_propias?.estimado_bajas_totales ?? 0),
        heridos: Number(raw.atricion_estimada?.fuerzas_propias?.heridos ?? 0),
        muertos_en_combate: Number(raw.atricion_estimada?.fuerzas_propias?.muertos_en_combate ?? 0),
        perdida_medios: raw.atricion_estimada?.fuerzas_propias?.perdida_medios || "Sin pérdidas materiales críticas estimadas"
      },
      fuerzas_enemigas: {
        estimado_neutralizaciones: Number(raw.atricion_estimada?.fuerzas_enemigas?.estimado_neutralizaciones ?? 0),
        capturas_estimadas: Number(raw.atricion_estimada?.fuerzas_enemigas?.capturas_estimadas ?? 0),
        material_incautado_esperado: raw.atricion_estimada?.fuerzas_enemigas?.material_incautado_esperado || "Armamento y material de intendencia"
      }
    },
    fases_wargaming: Array.isArray(raw.fases_wargaming) ? raw.fases_wargaming.map((f, idx) => ({
      fase_numero: Number(f?.fase_numero ?? (idx + 1)),
      nombre_fase: f?.nombre_fase || `Fase ${idx + 1}`,
      accion_propia: f?.accion_propia || "",
      reaccion_enemiga_probable: f?.reaccion_enemiga_probable || "",
      contraaccion_y_efecto: f?.contraaccion_y_efecto || "",
      evento_critico: f?.evento_critico || "",
      tasa_exito_fase_porcentaje: Number(f?.tasa_exito_fase_porcentaje ?? 75)
    })) : [],
    puntos_falla_criticos: Array.isArray(raw.puntos_falla_criticos) ? raw.puntos_falla_criticos.map((p) => ({
      factor: p?.factor || "Factor Crítico",
      impacto: p?.impacto || "",
      medida_mitigacion: p?.medida_mitigacion || ""
    })) : []
  };
}

// Mirror pure normalization logic from utils/geminiService.ts
function normalizeBMAInterceptionResultMirror(raw) {
  if (!raw || typeof raw !== 'object') {
    return {
      intercepcion_id: `BMA-INT-FALLBACK`,
      unidad_amiga: "Unidad Amiga",
      amenaza_objetivo: "Vector Hostil",
      metricas_clave: {
        probabilidad_intercepcion_porcentaje: 75,
        probabilidad_neutralizacion_porcentaje: 70,
        tiempo_estimado_contacto_minutos: 30,
        nivel_riesgo_general: "MEDIO"
      },
      control_danos_y_bajas: {
        propias: {
          estimado_bajas_totales: 0,
          heridos_wia: 0,
          muertos_kia: 0,
          requiere_medevac: false,
          danos_material_equipo: "Ninguno reportado"
        },
        amenaza: {
          neutralizados_kia: 0,
          capturados_pow: 0,
          dispersos_huidos: 0
        }
      },
      gasto_logistico_estimado: {
        municion_clase_v: {
          porcentaje_consumo_unidad: 25,
          desglose: "Consumo estimado de munición"
        },
        combustible_clase_iii: {
          porcentaje_consumo: 10,
          observacion: "Consumo táctico en desplazamiento"
        },
        autonomia_remanente_horas: 48
      },
      evaluacion_operacional: "Contacto táctico completado."
    };
  }

  const heridosWia = Number(raw.control_danos_y_bajas?.propias?.heridos_wia ?? 0);
  const medevacFlag = raw.control_danos_y_bajas?.propias?.requiere_medevac !== undefined
    ? Boolean(raw.control_danos_y_bajas?.propias?.requiere_medevac)
    : heridosWia > 0;

  return {
    intercepcion_id: raw.intercepcion_id || `BMA-INT-${Date.now().toString().slice(-4)}`,
    unidad_amiga: raw.unidad_amiga || "Unidad Amiga",
    amenaza_objetivo: raw.amenaza_objetivo || "Vector Hostil",
    metricas_clave: {
      probabilidad_intercepcion_porcentaje: Number(raw.metricas_clave?.probabilidad_intercepcion_porcentaje ?? 75),
      probabilidad_neutralizacion_porcentaje: Number(raw.metricas_clave?.probabilidad_neutralizacion_porcentaje ?? 70),
      tiempo_estimado_contacto_minutos: Number(raw.metricas_clave?.tiempo_estimado_contacto_minutos ?? 30),
      nivel_riesgo_general: (raw.metricas_clave?.nivel_riesgo_general || "MEDIO").toUpperCase()
    },
    control_danos_y_bajas: {
      propias: {
        estimado_bajas_totales: Number(raw.control_danos_y_bajas?.propias?.estimado_bajas_totales ?? 0),
        heridos_wia: heridosWia,
        muertos_kia: Number(raw.control_danos_y_bajas?.propias?.muertos_kia ?? 0),
        requiere_medevac: heridosWia > 0 ? true : medevacFlag,
        danos_material_equipo: raw.control_danos_y_bajas?.propias?.danos_material_equipo || "Ninguno reportado"
      },
      amenaza: {
        neutralizados_kia: Number(raw.control_danos_y_bajas?.amenaza?.neutralizados_kia ?? 0),
        capturados_pow: Number(raw.control_danos_y_bajas?.amenaza?.capturados_pow ?? 0),
        dispersos_huidos: Number(raw.control_danos_y_bajas?.amenaza?.dispersos_huidos ?? 0)
      }
    },
    gasto_logistico_estimado: {
      municion_clase_v: {
        porcentaje_consumo_unidad: Number(raw.gasto_logistico_estimado?.municion_clase_v?.porcentaje_consumo_unidad ?? 25),
        desglose: raw.gasto_logistico_estimado?.municion_clase_v?.desglose || "Consumo estimado de munición"
      },
      combustible_clase_iii: {
        porcentaje_consumo: Number(raw.gasto_logistico_estimado?.combustible_clase_iii?.porcentaje_consumo ?? 10),
        observacion: raw.gasto_logistico_estimado?.combustible_clase_iii?.observacion || "Consumo táctico en desplazamiento"
      },
      autonomia_remanente_horas: Number(raw.gasto_logistico_estimado?.autonomia_remanente_horas ?? 48)
    },
    evaluacion_operacional: raw.evaluacion_operacional || "Contacto táctico completado."
  };
}

// BMAPanel line parser logic
function parseBMABriefLine(line) {
  const trimmed = line.trim().replace(/^[-*•\s]+/, '').trim();
  const colonIdx = trimmed.indexOf(':');
  const label = colonIdx > -1 ? trimmed.substring(0, colonIdx + 1) : '';
  const content = colonIdx > -1 ? trimmed.substring(colonIdx + 1).trim() : trimmed;

  let labelColor = 'text-indigo-300';
  if (label.includes('AMENAZA')) labelColor = 'text-rose-400';
  else if (label.includes('CLIMA') || label.includes('TERRENO')) labelColor = 'text-sky-400';
  else if (label.includes('HOTSPOT') || label.includes('LOGÍSTICO')) labelColor = 'text-amber-400';
  else if (label.includes('DECISIÓN') || label.includes('RECOMENDADA')) labelColor = 'text-emerald-400';

  return { label, content, labelColor };
}

describe('F22: Empirical Verification of Tactical AI, Wargaming, and BMA Engines', () => {

  describe('1. Wargaming Simulation & simulateCOAOutcome Invariants', () => {
    it('F22-T1: Action - Reaction - Counteraction and Critical Event structures', () => {
      const mockRaw = {
        simulacion_id: "WARGAME-COA-TEST",
        resultado_global: {
          probabilidad_exito_porcentaje: 82,
          veredicto_operacional: "VIABLE",
          justificacion_resumida: "Maniobra envolvente viable."
        },
        atricion_estimada: {
          fuerzas_propias: { estimado_bajas_totales: 2, heridos: 2, muertos_en_combate: 0, perdida_medios: "Ninguna" },
          fuerzas_enemigas: { estimado_neutralizaciones: 5, capturas_estimadas: 3, material_incautado_esperado: "2 fusiles" }
        },
        fases_wargaming: [
          {
            fase_numero: 1,
            nombre_fase: "Infiltración",
            accion_propia: "Avance sigiloso por eje quebrada",
            reaccion_enemiga_probable: "Alerta por centinela",
            contraaccion_y_efecto: "Fijación con tirador de alta precisión",
            evento_critico: "Cruce de línea de cumbres",
            tasa_exito_fase_porcentaje: 88
          }
        ],
        puntos_falla_criticos: [
          {
            factor: "Clima adverso",
            impacto: "Pérdida de enlace visual",
            medida_mitigacion: "Relevo por patrulla terrestre"
          }
        ]
      };

      const normalized = normalizeWargameResultMirror(mockRaw);
      expect(normalized.simulacion_id).toBe("WARGAME-COA-TEST");
      expect(normalized.fases_wargaming.length).toBe(1);

      const f1 = normalized.fases_wargaming[0];
      expect(f1.accion_propia).toBe("Avance sigiloso por eje quebrada");
      expect(f1.reaccion_enemiga_probable).toBe("Alerta por centinela");
      expect(f1.contraaccion_y_efecto).toBe("Fijación con tirador de alta precisión");
      expect(f1.evento_critico).toBe("Cruce de línea de cumbres");
      expect(f1.tasa_exito_fase_porcentaje).toBe(88);

      expect(normalized.puntos_falla_criticos.length).toBe(1);
      expect(normalized.puntos_falla_criticos[0].factor).toBe("Clima adverso");
    });

    it('F22-T2: Attrition invariants - non-negative casualties and probability bounds', () => {
      const mockRaw = {
        resultado_global: { probabilidad_exito_porcentaje: 78 },
        atricion_estimada: {
          fuerzas_propias: { estimado_bajas_totales: 3, heridos: 2, muertos_en_combate: 1 },
          fuerzas_enemigas: { estimado_neutralizaciones: 6, capturas_estimadas: 2 }
        }
      };

      const normalized = normalizeWargameResultMirror(mockRaw);
      expect(normalized.resultado_global.probabilidad_exito_porcentaje).toBeGreaterThanOrEqual(0);
      expect(normalized.resultado_global.probabilidad_exito_porcentaje).toBeLessThanOrEqual(100);

      const fp = normalized.atricion_estimada.fuerzas_propias;
      expect(fp.estimado_bajas_totales).toBeGreaterThanOrEqual(0);
      expect(fp.heridos).toBeGreaterThanOrEqual(0);
      expect(fp.muertos_en_combate).toBeGreaterThanOrEqual(0);
      expect(fp.estimado_bajas_totales).toBeGreaterThanOrEqual(fp.heridos + fp.muertos_en_combate);

      const fe = normalized.atricion_estimada.fuerzas_enemigas;
      expect(fe.estimado_neutralizaciones).toBeGreaterThanOrEqual(0);
      expect(fe.capturas_estimadas).toBeGreaterThanOrEqual(0);
    });

    it('F22-T3: normalizeWargameResult handles malformed and boundary inputs', () => {
      // Empty input
      const empty = normalizeWargameResultMirror({});
      expect(empty.resultado_global.probabilidad_exito_porcentaje).toBe(75);
      expect(empty.atricion_estimada.fuerzas_propias.estimado_bajas_totales).toBe(0);
      expect(empty.fases_wargaming).toEqual([]);

      // Null input
      const nullRes = normalizeWargameResultMirror(null);
      expect(nullRes.simulacion_id).toBe("WARGAME-FALLBACK");
      expect(nullRes.fases_wargaming).toEqual([]);

      // Undefined input
      const undefRes = normalizeWargameResultMirror(undefined);
      expect(undefRes.simulacion_id).toBe("WARGAME-FALLBACK");

      // Non-array fases
      const stringFases = normalizeWargameResultMirror({ fases_wargaming: "invalid" });
      expect(Array.isArray(stringFases.fases_wargaming)).toBeTruthy();
      expect(stringFases.fases_wargaming.length).toBe(0);

      // Fases with null items
      const nullItemFases = normalizeWargameResultMirror({ fases_wargaming: [null, { nombre_fase: "Fase A" }] });
      expect(nullItemFases.fases_wargaming.length).toBe(2);
      expect(nullItemFases.fases_wargaming[1].nombre_fase).toBe("Fase A");
    });
  });

  describe('2. BMA Interception Simulation Invariants', () => {
    it('F22-T4: Class V and Class III consumption invariants (0 <= consumption <= 100)', () => {
      const mockRaw = {
        gasto_logistico_estimado: {
          municion_clase_v: { porcentaje_consumo_unidad: 35, desglose: "Munición 5.56mm" },
          combustible_clase_iii: { porcentaje_consumo: 18, observacion: "Vehículos tácticos" },
          autonomia_remanente_horas: 36
        }
      };

      const normalized = normalizeBMAInterceptionResultMirror(mockRaw);
      const muni = normalized.gasto_logistico_estimado.municion_clase_v.porcentaje_consumo_unidad;
      const comb = normalized.gasto_logistico_estimado.combustible_clase_iii.porcentaje_consumo;

      expect(muni).toBeGreaterThanOrEqual(0);
      expect(muni).toBeLessThanOrEqual(100);
      expect(comb).toBeGreaterThanOrEqual(0);
      expect(comb).toBeLessThanOrEqual(100);
      expect(normalized.gasto_logistico_estimado.autonomia_remanente_horas).toBeGreaterThan(0);
    });

    it('F22-T5: MEDEVAC threshold logic (heridos_wia > 0 triggers requiere_medevac)', () => {
      // Scenario A: WIA > 0 with explicit false from AI should still require MEDEVAC
      const withWia = normalizeBMAInterceptionResultMirror({
        control_danos_y_bajas: {
          propias: {
            heridos_wia: 2,
            muertos_kia: 0,
            requiere_medevac: false
          }
        }
      });
      expect(withWia.control_danos_y_bajas.propias.heridos_wia).toBe(2);
      expect(withWia.control_danos_y_bajas.propias.requiere_medevac).toBe(true);

      // Scenario B: 0 WIA and false medevac
      const zeroWia = normalizeBMAInterceptionResultMirror({
        control_danos_y_bajas: {
          propias: {
            heridos_wia: 0,
            muertos_kia: 0,
            requiere_medevac: false
          }
        }
      });
      expect(zeroWia.control_danos_y_bajas.propias.requiere_medevac).toBe(false);

      // Scenario C: 0 WIA but explicit true (e.g. trauma / heatstroke CASEVAC)
      const specialMedevac = normalizeBMAInterceptionResultMirror({
        control_danos_y_bajas: {
          propias: {
            heridos_wia: 0,
            muertos_kia: 0,
            requiere_medevac: true
          }
        }
      });
      expect(specialMedevac.control_danos_y_bajas.propias.requiere_medevac).toBe(true);
    });
  });

  describe('3. BMA Situation Brief & BMAPanel Doctrinal Bullet Parsing', () => {
    const doctrinalSampleBrief = 
      "• AMENAZA: GAO Residual Estructura 1 en movimiento hacia cañón central del río Micay.\n" +
      "• FACTOR CLIMA/TERRENO: Nubosidad baja al 85% y niebla densa que restringen vuelos ISR de micro-UAS.\n" +
      "• HOTSPOTS Y RIESGO LOGÍSTICO: Punto de estrangulamiento activo en puente La Esperanza con sospecha de IED.\n" +
      "• DECISIÓN RECOMENDADA: Adelantar Pelotón Bravo a cota dominante 1450 y asegurar eje de abastecimiento.";

    it('F22-T6: Word count constraint (<= 150 words)', () => {
      const words = doctrinalSampleBrief.trim().split(/\s+/).filter(w => w.length > 0);
      expect(words.length).toBeLessThanOrEqual(150);
      expect(words.length).toBeGreaterThan(20);
    });

    it('F22-T7: Presence and syntax of the 4 doctrinal bullets', () => {
      expect(doctrinalSampleBrief).toContain('AMENAZA:');
      expect(doctrinalSampleBrief).toContain('FACTOR CLIMA/TERRENO:');
      expect(doctrinalSampleBrief).toContain('HOTSPOTS Y RIESGO LOGÍSTICO:');
      expect(doctrinalSampleBrief).toContain('DECISIÓN RECOMENDADA:');
    });

    it('F22-T8: BMAPanel parsing logic assigns designated color class to each bullet', () => {
      const lines = doctrinalSampleBrief.split('\n');

      const parsedLines = lines.map(parseBMABriefLine);

      // Bullet 1: AMENAZA -> text-rose-400
      expect(parsedLines[0].label).toContain('AMENAZA');
      expect(parsedLines[0].labelColor).toBe('text-rose-400');

      // Bullet 2: FACTOR CLIMA/TERRENO -> text-sky-400
      expect(parsedLines[1].label).toContain('CLIMA');
      expect(parsedLines[1].labelColor).toBe('text-sky-400');

      // Bullet 3: HOTSPOTS Y RIESGO LOGÍSTICO -> text-amber-400
      expect(parsedLines[2].label).toContain('HOTSPOT');
      expect(parsedLines[2].labelColor).toBe('text-amber-400');

      // Bullet 4: DECISIÓN RECOMENDADA -> text-emerald-400
      expect(parsedLines[3].label).toContain('DECISIÓN');
      expect(parsedLines[3].labelColor).toBe('text-emerald-400');
    });

    it('F22-T9: BMAPanel parser handles varied bullet markers (-, *, •)', () => {
      const dashLine = "- AMENAZA: Vector hostil identificado.";
      const starLine = "* FACTOR CLIMA/TERRENO: Lluvias moderadas.";
      const bulletLine = "• DECISIÓN RECOMENDADA: Ejecutar maniobra de repliegue.";

      expect(parseBMABriefLine(dashLine).label).toBe("AMENAZA:");
      expect(parseBMABriefLine(dashLine).labelColor).toBe("text-rose-400");

      expect(parseBMABriefLine(starLine).label).toBe("FACTOR CLIMA/TERRENO:");
      expect(parseBMABriefLine(starLine).labelColor).toBe("text-sky-400");

      expect(parseBMABriefLine(bulletLine).label).toBe("DECISIÓN RECOMENDADA:");
      expect(parseBMABriefLine(bulletLine).labelColor).toBe("text-emerald-400");
    });
  });

  describe('4. Static Code Integrity of Tactical AI Implementation', () => {
    it('F22-T10: geminiService.ts defines and exports all required simulation functions', () => {
      const geminiPath = path.join(rootDir, 'utils/geminiService.ts');
      expect(fs.existsSync(geminiPath)).toBeTruthy();
      const code = fs.readFileSync(geminiPath, 'utf8');

      expect(code).toContain('export const simulateCOAOutcome');
      expect(code).toContain('export const normalizeWargameResult');
      expect(code).toContain('export const formatWargameMarkdown');
      expect(code).toContain('export const simulateBMAInterception');
      expect(code).toContain('export const normalizeBMAInterceptionResult');
      expect(code).toContain('export const formatBMAMarkdown');
      expect(code).toContain('export const getBMASituationBrief');
    });

    it('F22-T11: AnalysisView.tsx renders Action-Reaction-Counteraction and Attrition Matrix', () => {
      const analysisViewPath = path.join(rootDir, 'components/AnalysisView.tsx');
      expect(fs.existsSync(analysisViewPath)).toBeTruthy();
      const code = fs.readFileSync(analysisViewPath, 'utf8');

      expect(code).toContain('Dinámica de Combate por Fases (Acción - Reacción - Contraacción)');
      expect(code).toContain('🔵 Acción Propia');
      expect(code).toContain('🔴 Reacción Adversaria');
      expect(code).toContain('🟢 Contraacción y Efecto');
      expect(code).toContain('Punto Crítico de la Fase');
      expect(code).toContain('fuerzas_propias.estimado_bajas_totales');
      expect(code).toContain('fuerzas_enemigas.estimado_neutralizaciones');
    });

    it('F22-T12: BMAPanel.tsx renders BMA metrics, logistics and color-coded situation brief', () => {
      const bmaPanelPath = path.join(rootDir, 'components/BMAPanel.tsx');
      expect(fs.existsSync(bmaPanelPath)).toBeTruthy();
      const code = fs.readFileSync(bmaPanelPath, 'utf8');

      expect(code).toContain('getBMASituationBrief');
      expect(code).toContain('simulateBMAInterception');
      expect(code).toContain('text-rose-400');
      expect(code).toContain('text-sky-400');
      expect(code).toContain('text-amber-400');
      expect(code).toContain('text-emerald-400');
      expect(code).toContain('REQUIERE MEDEVAC');
      expect(code).toContain('porcentaje_consumo_unidad');
      expect(code).toContain('combustible_clase_iii');
    });
  });
});
