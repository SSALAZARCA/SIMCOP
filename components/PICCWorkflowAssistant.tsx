import React, { useState, useMemo } from 'react';
import { 
  ShieldCheckIcon 
} from './icons/ShieldCheckIcon';
import { 
  ShieldExclamationIcon 
} from './icons/ShieldExclamationIcon';
import { 
  ExclamationTriangleIcon 
} from './icons/ExclamationTriangleIcon';
import { 
  CrosshairsIcon 
} from './icons/CrosshairsIcon';
import { 
  MapPinIcon 
} from './icons/MapPinIcon';
import { 
  EyeIcon 
} from './icons/EyeIcon';
import { 
  BoltIcon 
} from './icons/BoltIcon';
import { 
  FlagIcon 
} from './icons/FlagIcon';
import { 
  RulerIcon 
} from './icons/RulerIcon';
import { 
  PencilIcon 
} from './icons/PencilIcon';
import { 
  AcademicCapIcon 
} from './icons/AcademicCapIcon';
import { 
  TrashIcon 
} from './icons/TrashIcon';
import { 
  ChartBarIcon 
} from './icons/ChartBarIcon';
import { 
  SparklesIcon 
} from './icons/SparklesIcon';

import { 
  PlantillaType, 
  PICCElementType, 
  COAGraphicType 
} from '../types';
import type { 
  MilitaryUnit, 
  IntelligenceReport, 
  OsintEvent, 
  AfterActionReport, 
  COAPlan 
} from '../types';
import { piccService } from '../services/piccService';

interface PICCWorkflowAssistantProps {
  units: MilitaryUnit[];
  intelligenceReports: IntelligenceReport[];
  osintEvents?: OsintEvent[];
  afterActionReports?: AfterActionReport[];
  finalizedAoiGeoJson?: any;
  onSelectStepTool?: (toolType: string) => void;
  onActivateTemplate?: (template: PlantillaType) => void;
  eventBus: {
    publish(event: string, data?: any): void;
  };
}

export const PICCWorkflowAssistant: React.FC<PICCWorkflowAssistantProps> = ({
  units,
  intelligenceReports,
  osintEvents = [],
  afterActionReports = [],
  finalizedAoiGeoJson,
  onSelectStepTool,
  onActivateTemplate,
  eventBus,
}) => {
  const [activeStep, setActiveStep] = useState<1 | 2 | 3 | 4>(1);
  const [s2Feedback, setS2Feedback] = useState<string | null>(null);
  const [layerFeedback, setLayerFeedback] = useState<string | null>(null);
  const [satFilterYear, setSatFilterYear] = useState<string>('TODOS');

  // Filtro de Alertas Tempranas del SAT de la Defensoría del Pueblo
  const defensoriaSatAlerts = useMemo(() => {
    return osintEvents.filter(e => {
      const isSat = (e.eventType || '').toUpperCase().includes('ALERTA_TEMPRANA_SAT') || !!e.satMetadata;
      if (!isSat) return false;
      if (satFilterYear && satFilterYear !== 'TODOS') {
        const year = e.satMetadata?.anioEmision || (e.eventTimestamp ? new Date(e.eventTimestamp).getFullYear().toString() : '');
        const matchCodeYear = e.satMetadata?.numeroAlerta?.endsWith(`-${satFilterYear.slice(-2)}`);
        return year === satFilterYear || matchCodeYear;
      }
      return true;
    });
  }, [osintEvents, satFilterYear]);

  // Inteligencia de amenazas GAO y grupos hostiles
  const threatReports = useMemo(() => {
    const keywords = ['gao', 'eln', 'farc', 'disidencia', 'clan del golfo', 'enemigo', 'hostil', 'emboscada', 'campo minado', 'francotirador'];
    return intelligenceReports.filter(r => {
      const text = `${r.title} ${r.details}`.toLowerCase();
      return keywords.some(k => text.includes(k));
    });
  }, [intelligenceReports]);

  // Antecedentes de combate relevantes (AAR)
  const combatAARs = useMemo(() => {
    return afterActionReports.filter(a => 
      a.engagementResult?.toLowerCase().includes('contacto') || 
      a.engagementResult?.toLowerCase().includes('combate') ||
      (a.enemyCasualties && a.enemyCasualties > 0) ||
      (a.friendlyWia && a.friendlyWia > 0)
    );
  }, [afterActionReports]);

  const handleGraficarMedidasS2 = async () => {
    // 1. Determinar el centro de operaciones
    let lat = 4.5708;
    let lon = -74.2973;
    if (units.length > 0 && units[0].location) {
      lat = units[0].location.lat;
      lon = units[0].location.lon;
    } else if (threatReports.length > 0 && threatReports[0].location) {
      lat = threatReports[0].location.lat;
      lon = threatReports[0].location.lon;
    } else if (osintEvents.length > 0 && osintEvents[0].location) {
      lat = osintEvents[0].location.lat;
      lon = osintEvents[0].location.lon;
    }

    // 2. Construir medidas doctrinales completas S2 (MFRE 1-02.2)
    const s2COAPlan: COAPlan = {
      planName: 'Calco S2 - MLCOA / MDCOA (MFRE 1-02.2)',
      unitId: units[0]?.id || 's2-intel',
      conceptOfOperations: 'Medidas de Control de Inteligencia y Cursos de Acción del Enemigo (MLCOA/MDCOA) conforme al manual MFRE 1-02.2.',
      phases: [
        {
          phaseName: 'Fase S2: Vigilancia y Dispositivo Hostil',
          description: 'Línea de Coordinación de Inteligencia (ICL), Áreas Nombradas de Interés (ANI), Blancos de Interés (ABI) y Eje de Infiltración MLCOA.',
          graphics: [
            {
              type: COAGraphicType.INTEL_COORDINATION_LINE,
              label: 'TIGRE (Cota 1200)',
              locations: [
                { lat: lat + 0.02, lon: lon - 0.04 },
                { lat: lat + 0.025, lon: lon },
                { lat: lat + 0.03, lon: lon + 0.04 }
              ]
            },
            {
              type: COAGraphicType.NAMED_AREA_OF_INTEREST,
              label: 'ANI-1 Vado del Río',
              locations: [{ lat: lat + 0.015, lon: lon - 0.02 }]
            },
            {
              type: COAGraphicType.NAMED_AREA_OF_INTEREST,
              label: 'ANI-2 Encrucijada Veredal',
              locations: [{ lat: lat + 0.018, lon: lon + 0.025 }]
            },
            {
              type: COAGraphicType.TARGET_AREA_OF_INTEREST,
              label: 'ABI-1 Morteros/AEI',
              locations: [{ lat: lat + 0.035, lon: lon - 0.01 }]
            },
            {
              type: COAGraphicType.AXIS_OF_ADVANCE,
              label: 'Eje Infiltración MLCOA',
              locations: [
                { lat: lat + 0.04, lon: lon - 0.01 },
                { lat: lat + 0.025, lon: lon - 0.015 },
                { lat: lat + 0.015, lon: lon - 0.02 }
              ]
            }
          ]
        }
      ]
    };

    // 3. Proyectar gráficos de COA y guardarlos también en persistencia PICC
    eventBus.publish('renderCOAGraphics', s2COAPlan);
    eventBus.publish('newCOAPlan', s2COAPlan);

    // Guardar también puntos con simbología militar en piccService
    try {
      await piccService.saveGraphic({
        plantillaType: PlantillaType.INTELIGENCIA_ENEMIGA,
        graphicType: PICCElementType.ENEMY_LEADER_POINT,
        geoJson: JSON.stringify({
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [lon - 0.012, lat + 0.038] },
          properties: {}
        }),
        label: 'Cabecilla Comisión GAO (LDR)'
      });

      await piccService.saveGraphic({
        plantillaType: PlantillaType.INTELIGENCIA_ENEMIGA,
        graphicType: PICCElementType.ENEMY_GUERRILLA_POINT,
        geoJson: JSON.stringify({
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [lon - 0.02, lat + 0.028] },
          properties: {}
        }),
        label: 'Elemento Guerrilla GAO (G)'
      });
      eventBus.publish('refreshPiccGraphics');
    } catch (e) {
      console.warn("Nota: Guardado opcional en backend de gráficos PICC:", e);
    }

    // 4. Activar la plantilla de inteligencia enemiga en la vista de análisis
    if (onActivateTemplate) {
      onActivateTemplate(PlantillaType.INTELIGENCIA_ENEMIGA);
    }
    eventBus.publish('setTemplateContext', PlantillaType.INTELIGENCIA_ENEMIGA);

    // 5. Centrar la cámara en Cesium 3D sobre el sector operacional
    eventBus.publish('panToLocationAndShowInfo', {
      location: { lat: lat + 0.02, lon: lon },
      displayName: 'Sector Táctico Medidas S2 (MFRE 1-02.2)',
      placeType: 'PICC / S2'
    });

    setS2Feedback('✅ Medidas S2 proyectadas en Cesium 3D: ICL Tigre, ANI-1, ANI-2, ABI-1, Eje MLCOA y Cabecilla LDR. Herramientas S2 listas en el panel inferior.');
    setTimeout(() => setS2Feedback(null), 8000);
  };

  const handleClearMedidasGraficadas = () => {
    // 1. Limpiar capa COA en Cesium
    eventBus.publish('clearCOALayer', {});
    // 2. Limpiar capa PICC en Cesium
    eventBus.publish('clearPiccLayer', {});
    // 3. Eliminar de almacenamiento local
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.removeItem('simcop_active_coa_plan');
      }
    } catch (e) {
      console.warn("Error clearing localStorage:", e);
    }
    setS2Feedback('🗑️ Calco táctico y medidas de control S2 eliminadas del mapa Cesium 3D.');
    setTimeout(() => setS2Feedback(null), 6000);
  };

  return (
    <div className="bg-gray-850 border border-lime-800/60 rounded-xl p-4 shadow-xl text-gray-100">
      {/* Cabecera Doctrinal */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-gray-700/80 pb-3 mb-4 gap-2">
        <div className="flex items-center space-x-2">
          <div className="p-2 bg-lime-950/80 border border-lime-600/50 rounded-lg text-lime-400">
            <AcademicCapIcon className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-lime-300 flex items-center gap-2">
              PICC: Preparación de Inteligencia del Campo de Combate
              <span className="text-[10px] px-2 py-0.5 rounded bg-lime-900/60 text-lime-300 font-mono border border-lime-700/50">
                MTE 2-01.3
              </span>
            </h3>
            <p className="text-xs text-gray-400">
              Proceso doctrinal continuo para soporte al Estado Mayor (S2/S3) y el PMTD
            </p>
          </div>
        </div>

        {/* Badges de Fuentes Conectadas */}
        <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
          <span className="px-2 py-0.5 bg-blue-950 text-blue-300 rounded border border-blue-800/60 flex items-center gap-1">
            <MapPinIcon className="w-3 h-3" /> IGAC Topo
          </span>
          <span className="px-2 py-0.5 bg-amber-950 text-amber-300 rounded border border-amber-800/60 flex items-center gap-1">
            <ShieldExclamationIcon className="w-3 h-3" /> SAT Defensoría ({defensoriaSatAlerts.length})
          </span>
          <span className="px-2 py-0.5 bg-rose-950 text-rose-300 rounded border border-rose-800/60 flex items-center gap-1">
            <EyeIcon className="w-3 h-3" /> S2 Intel ({threatReports.length})
          </span>
        </div>
      </div>

      {/* Stepper de 4 Pasos Doctrinales */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
        {[
          { num: 1, title: 'Paso 1: Ambiente', sub: 'AO, AOI y Límites DANE' },
          { num: 2, title: 'Paso 2: Efectos', sub: 'OATOC / CMOC & AECOPE' },
          { num: 3, title: 'Paso 3: Amenaza', sub: 'Orden de Batalla & HVTL' },
          { num: 4, title: 'Paso 4: Cursos COA', sub: 'MLCOA, MDCOA & Eventos' },
        ].map((s) => (
          <button
            key={s.num}
            onClick={() => setActiveStep(s.num as any)}
            className={`p-2.5 rounded-lg border text-left transition-all ${
              activeStep === s.num
                ? 'bg-lime-950/70 border-lime-500 text-white shadow-lg ring-1 ring-lime-500/40'
                : 'bg-gray-800/60 border-gray-700/60 text-gray-400 hover:bg-gray-800 hover:text-gray-200'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className={`text-xs font-bold ${activeStep === s.num ? 'text-lime-300' : 'text-gray-400'}`}>
                {s.title}
              </span>
              <span className={`text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold ${
                activeStep === s.num ? 'bg-lime-500 text-black' : 'bg-gray-700 text-gray-300'
              }`}>
                {s.num}
              </span>
            </div>
            <p className="text-[11px] truncate opacity-80">{s.sub}</p>
          </button>
        ))}
      </div>

      {/* CONTENIDO DEL PASO ACTIVO */}
      <div className="bg-gray-900/80 border border-gray-800 rounded-lg p-3.5 space-y-3">
        {/* PASO 1 */}
        {activeStep === 1 && (
          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-sm text-lime-400 flex items-center gap-1.5">
                <span>📍</span> Paso 1: Definir el Ambiente Operacional (Cap. 3 MTE 2-01.3)
              </h4>
              <span className="text-[10px] text-gray-400 font-mono">
                {finalizedAoiGeoJson ? 'AOI DELIMITADA ACTIVA' : 'PENDIENTE DELIMITACIÓN AOI'}
              </span>
            </div>
            <p className="text-gray-300">
              Identifica los límites espaciales y jurisdiccionales para enfocar el esfuerzo de inteligencia del Estado Mayor.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
              <div className="bg-gray-800 p-2.5 rounded border border-gray-700 space-y-1">
                <span className="font-bold text-sky-400 block">Área de Operaciones (AO)</span>
                <p className="text-gray-400 text-[11px]">
                  Espacio geográfico asignado a la unidad militar para cumplir la misión encomendada.
                </p>
                <button
                  onClick={() => onSelectStepTool?.('DRAW_AOI')}
                  className="mt-2 w-full py-1 bg-sky-700 hover:bg-sky-600 text-white rounded text-[11px] font-medium"
                >
                  {finalizedAoiGeoJson ? 'Redelimitar AO en Mapa' : 'Delimitar AO en 3D'}
                </button>
              </div>

              <div className="bg-gray-800 p-2.5 rounded border border-gray-700 space-y-1">
                <span className="font-bold text-indigo-400 block">Área de Interés (AI)</span>
                <p className="text-gray-400 text-[11px]">
                  Áreas adyacentes donde el enemigo puede canalizar reservas o rutas de escape hacia otros municipios.
                </p>
                <div className="text-[10px] text-gray-300 bg-gray-900 p-1.5 rounded">
                  Cruza con límites Divipola DANE del IGAC.
                </div>
              </div>

              <div className="bg-gray-800 p-2.5 rounded border border-gray-700 space-y-1">
                <span className="font-bold text-emerald-400 block">Tropas Orgánicas en el AO</span>
                <p className="text-gray-400 text-[11px]">
                  {units.length} unidades disponibles en la zona con telemetría en tiempo real.
                </p>
                <div className="text-[10px] text-emerald-300 bg-emerald-950/40 p-1.5 rounded border border-emerald-900/40">
                  Enlace M2M sincronizado con SIGEP.
                </div>
              </div>
            </div>
          </div>
        )}

        {/* PASO 2 */}
        {activeStep === 2 && (
          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-sm text-lime-400 flex items-center gap-1.5">
                <span>⛰️</span> Paso 2: Describir los Efectos del Ambiente (Cap. 4 MTE 2-01.3)
              </h4>
              <span className="text-[10px] text-amber-300 font-mono bg-amber-950/60 px-2 py-0.5 rounded border border-amber-800/50">
                OATOC + AECOPE
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* OATOC / CMOC Terreno */}
              <div className="bg-gray-800/90 p-3 rounded-lg border border-gray-700 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-cyan-300 flex items-center gap-1">
                    <ChartBarIcon className="w-4 h-4" /> CMOC: Obstáculos y Relieve (IGAC)
                  </span>
                  <span className="text-[10px] text-cyan-400">DEM Altimetría</span>
                </div>
                <p className="text-[11px] text-gray-300">
                  Clasificación militar de transitabilidad según gradiente topográfico y red hidrográfica:
                </p>
                <div className="space-y-1 text-[11px]">
                  <div className="flex items-center justify-between p-1.5 rounded bg-emerald-950/40 border border-emerald-900/40">
                    <span className="text-emerald-300 font-medium">Terreno Sin Restricciones (&lt;15°)</span>
                    <span className="text-gray-400">Valles y corredores viales</span>
                  </div>
                  <div className="flex items-center justify-between p-1.5 rounded bg-amber-950/40 border border-amber-900/40">
                    <span className="text-amber-300 font-medium">Terreno Restringido (15° - 30°)</span>
                    <span className="text-gray-400">Cuchillas y laderas medias</span>
                  </div>
                  <div className="flex items-center justify-between p-1.5 rounded bg-rose-950/40 border border-rose-900/40">
                    <span className="text-rose-300 font-medium">Terreno Severamente Restringido (&gt;30°)</span>
                    <span className="text-gray-400">Farallones y cañones fluviales</span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-1.5 pt-1">
                  <button
                    onClick={() => {
                      eventBus.publish('setCmocTransitLayer', true);
                      setLayerFeedback('⛰️ Transitabilidad CMOC activada: Pendientes (<15° Verde, 15°-30° Amarillo, >30° Rojo).');
                      setTimeout(() => setLayerFeedback(null), 6000);
                    }}
                    className="py-1.5 px-2 bg-emerald-800 hover:bg-emerald-700 text-white rounded font-medium text-[10px] transition flex items-center justify-center gap-1 shadow"
                    title="Clasificar pendientes del terreno según doctrina militar CMOC"
                  >
                    <span>⛰️</span> Transitabilidad CMOC
                  </button>
                  <button
                    onClick={() => {
                      eventBus.publish('setHydrographyLayer', true);
                      setLayerFeedback('🌊 Red Hidrográfica activada: Principales ríos y cursos de agua de Colombia.');
                      setTimeout(() => setLayerFeedback(null), 6000);
                    }}
                    className="py-1.5 px-2 bg-cyan-800 hover:bg-cyan-700 text-white rounded font-medium text-[10px] transition flex items-center justify-center gap-1 shadow"
                    title="Visualizar ríos y cañones como obstáculos naturales"
                  >
                    <span>🌊</span> Red Hidrográfica
                  </button>
                  <button
                    onClick={() => {
                      eventBus.publish('setRoadsLayer', true);
                      setLayerFeedback('🛣️ Red Vial y Corredores de Movilidad superpuestos sobre el relieve.');
                      setTimeout(() => setLayerFeedback(null), 6000);
                    }}
                    className="py-1.5 px-2 bg-amber-800 hover:bg-amber-700 text-white rounded font-medium text-[10px] transition flex items-center justify-center gap-1 shadow"
                    title="Superponer corredores viales y carreteras"
                  >
                    <span>🛣️</span> Red Vial / Corredores
                  </button>
                  <button
                    onClick={() => {
                      eventBus.publish('setCmocTransitLayer', true);
                      eventBus.publish('setHydrographyLayer', true);
                      eventBus.publish('setRoadsLayer', true);
                      eventBus.publish('setMapLayer', 'igac-pol');
                      setLayerFeedback('🗺️ Calco Completo CMOC Integrado: Relieve tricolor + Ríos + Vías + Cartografía militar.');
                      setTimeout(() => setLayerFeedback(null), 8000);
                    }}
                    className="py-1.5 px-2 bg-gradient-to-r from-cyan-600 to-emerald-600 hover:from-cyan-500 hover:to-emerald-500 text-white rounded font-bold text-[10px] transition flex items-center justify-center gap-1 shadow-lg"
                    title="Activar simultáneamente todos los componentes del CMOC"
                  >
                    <span>🗺️</span> CMOC Completo
                  </button>
                </div>
                <div className="flex items-center justify-between pt-1">
                  <button
                    onClick={() => {
                      eventBus.publish('setCmocTransitLayer', false);
                      setLayerFeedback('ℹ️ Sombreado de pendientes CMOC desactivado.');
                      setTimeout(() => setLayerFeedback(null), 4000);
                    }}
                    className="text-[10px] text-gray-400 hover:text-gray-200 underline transition"
                  >
                    Desactivar sombreado CMOC
                  </button>
                  <button
                    onClick={() => {
                      eventBus.publish('setMapLayer', 'igac-sat');
                      eventBus.publish('setCmocTransitLayer', false);
                      eventBus.publish('setRoadsLayer', false);
                      setLayerFeedback('🛰️ Vista Satelital Pura HD restaurada.');
                      setTimeout(() => setLayerFeedback(null), 4000);
                    }}
                    className="text-[10px] text-sky-400 hover:text-sky-300 underline transition"
                  >
                    Restaurar Satélite HD
                  </button>
                </div>
                {layerFeedback && (
                  <p className="text-[10px] text-cyan-300 bg-cyan-950/80 border border-cyan-800 p-1.5 rounded text-center animate-in fade-in">
                    {layerFeedback}
                  </p>
                )}
              </div>

              {/* AECOPE Consideraciones Civiles / Defensoría */}
              <div className="bg-gray-800/90 p-3 rounded-lg border border-gray-700 space-y-2">
                <div className="flex items-center justify-between flex-wrap gap-1">
                  <span className="font-bold text-amber-300 flex items-center gap-1">
                    <ShieldExclamationIcon className="w-4 h-4" /> AECOPE: Alertas SAT Defensoría
                  </span>
                  <div className="flex items-center gap-1.5">
                    <select
                      value={satFilterYear}
                      onChange={e => setSatFilterYear(e.target.value)}
                      className="bg-gray-950 text-amber-300 border border-amber-800/80 rounded px-1.5 py-0.5 text-[10px] font-mono outline-none cursor-pointer"
                    >
                      <option value="TODOS">Todos (369)</option>
                      <option value="2026">2026 (23)</option>
                      <option value="2025">2025 (20)</option>
                      <option value="2024">2024 (27)</option>
                      <option value="2023">2023 (39)</option>
                      <option value="2022">2022 (34)</option>
                      <option value="2021">2021 (29)</option>
                      <option value="2020">2020 (54)</option>
                      <option value="2019">2019 (56)</option>
                      <option value="2018">2018 (86)</option>
                      <option value="2017">2017 (1)</option>
                    </select>
                    <span className="text-[10px] text-amber-400 font-mono">
                      ({defensoriaSatAlerts.length})
                    </span>
                  </div>
                </div>
                <p className="text-[11px] text-gray-300">
                  Evaluación de Áreas, Estructuras, Capacidades, Organizaciones y Población bajo riesgo:
                </p>

                {defensoriaSatAlerts.length > 0 ? (
                  <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                    {defensoriaSatAlerts.map(alert => (
                      <div 
                        key={alert.id} 
                        onClick={() => {
                          if (alert.location) {
                            eventBus.publish('panToLocationAndShowInfo', {
                              location: alert.location,
                              displayName: `Defensoría SAT: ${alert.satMetadata?.numeroAlerta || alert.title}`,
                              placeType: 'ALERTA TEMPRANA SAT'
                            });
                          }
                        }}
                        className="p-2 bg-gray-900/90 hover:bg-gray-900 rounded border border-amber-900/50 hover:border-amber-500/80 space-y-1 cursor-pointer transition"
                        title="Haz clic para centrar el visor 3D en la zona alertada"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-amber-300 text-[11px]">
                            {alert.satMetadata?.numeroAlerta || alert.title}
                          </span>
                          <span className={`text-[10px] px-1.5 py-0.2 rounded font-bold ${
                            alert.satMetadata?.nivelRiesgo === 'INMINENTE' 
                              ? 'bg-rose-900 text-rose-200' 
                              : 'bg-amber-900 text-amber-200'
                          }`}>
                            {alert.satMetadata?.nivelRiesgo || 'ESTRUCTURAL'}
                          </span>
                        </div>
                        <p className="text-[10px] text-gray-400 line-clamp-2">
                          {alert.summary}
                        </p>
                        {alert.satMetadata?.gaosInvolucrados && (
                          <div className="text-[10px] text-red-300 font-mono">
                            GAO: {alert.satMetadata.gaosInvolucrados.join(', ')}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-3 bg-gray-900 text-gray-400 text-center rounded border border-gray-800">
                    No se registran alertas humanitarias críticas en este sector.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* PASO 3 */}
        {activeStep === 3 && (
          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-sm text-lime-400 flex items-center gap-1.5">
                <span>🎯</span> Paso 3: Evaluar la Amenaza (Cap. 5 MTE 2-01.3)
              </h4>
              <span className="text-[10px] text-rose-300 font-mono bg-rose-950/60 px-2 py-0.5 rounded border border-rose-800/50">
                Orden de Batalla & HVTL
              </span>
            </div>
            <p className="text-gray-300">
              Caracterización de las capacidades, doctrina, armamento, cabecillas y TTPs de las estructuras ilegales presentes.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Informes de Inteligencia y Facciones */}
              <div className="bg-gray-800/90 p-3 rounded-lg border border-gray-700 space-y-2">
                <span className="font-bold text-red-400 block">Estructuras Identificadas (S2 / OSINT)</span>
                <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                  {threatReports.slice(0, 4).map(report => (
                    <div key={report.id} className="p-2 bg-gray-900 rounded border border-red-900/40 text-[11px] space-y-1">
                      <div className="flex justify-between font-bold text-red-300">
                        <span className="truncate">{report.title}</span>
                        <span className="text-[10px] text-gray-400 font-mono">
                          {report.reliability}{report.credibility}
                        </span>
                      </div>
                      <p className="text-[10px] text-gray-400 line-clamp-2">{report.details}</p>
                    </div>
                  ))}
                  {threatReports.length === 0 && (
                    <p className="text-gray-500 text-center py-3">No hay reportes hostiles activos.</p>
                  )}
                </div>
              </div>

              {/* Lista de Blancos de Alto Valor (HVTL) */}
              <div className="bg-gray-800/90 p-3 rounded-lg border border-gray-700 space-y-2">
                <span className="font-bold text-amber-400 block">Lista de Blancos de Alto Valor (HVTL)</span>
                <p className="text-[11px] text-gray-400">
                  Activos o líderes cuya neutralización degrada decisivamente la capacidad operativa del GAO:
                </p>
                <div className="space-y-1 text-[11px]">
                  <div className="p-2 bg-gray-900 rounded border border-amber-900/40 flex justify-between items-center">
                    <div>
                      <span className="font-bold text-amber-300 block">Cabecilla de Frente / Comisión</span>
                      <span className="text-[10px] text-gray-400">Mando y Control (Modificador MFRE: LDR)</span>
                    </div>
                    <span className="px-2 py-0.5 bg-rose-900/60 text-rose-300 rounded font-bold text-[10px]">
                      Prioridad 1
                    </span>
                  </div>
                  <div className="p-2 bg-gray-900 rounded border border-amber-900/40 flex justify-between items-center">
                    <div>
                      <span className="font-bold text-amber-300 block">Comisión de Finanzas y Extorsión</span>
                      <span className="text-[10px] text-gray-400">Sostenimiento Logístico del GAO</span>
                    </div>
                    <span className="px-2 py-0.5 bg-amber-900/60 text-amber-300 rounded font-bold text-[10px]">
                      Prioridad 2
                    </span>
                  </div>
                  <div className="p-2 bg-gray-900 rounded border border-amber-900/40 flex justify-between items-center">
                    <div>
                      <span className="font-bold text-amber-300 block">Talleres de Artefactos Explosivos (AEI / MAP)</span>
                      <span className="text-[10px] text-gray-400">Capacidad Ofensiva Asimétrica</span>
                    </div>
                    <span className="px-2 py-0.5 bg-yellow-900/60 text-yellow-300 rounded font-bold text-[10px]">
                      Prioridad 3
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Análisis Histórico de Factores de Inestabilidad (MTE 2-01.3 & Simbología OTAN) */}
            <div className="bg-gray-800/90 p-3 rounded-lg border border-amber-900/60 space-y-2 mt-2">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <span className="font-bold text-amber-300 flex items-center gap-1.5">
                  <span>📜</span> Histórico Factores de Inestabilidad (21.434+ Eventos / Simbología OTAN)
                </span>
                <span className="text-[10px] bg-amber-950 text-amber-300 px-2 py-0.5 rounded border border-amber-800 font-mono">
                  2015 – 2026
                </span>
              </div>
              <p className="text-[11px] text-gray-300">
                Patrón histórico de incidentes armados, corredores de narcotráfico y hechos operacionales a nivel nacional:
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-center">
                <div className="p-2 bg-red-950/40 border border-red-900/60 rounded">
                  <div className="text-red-400 font-bold text-sm">10.081</div>
                  <div className="text-[10px] text-gray-400 uppercase font-semibold">🔴 Hostil (Rombo)</div>
                </div>
                <div className="p-2 bg-blue-950/40 border border-blue-900/60 rounded">
                  <div className="text-blue-400 font-bold text-sm">9.283</div>
                  <div className="text-[10px] text-gray-400 uppercase font-semibold">🔵 Amigo (Rectángulo)</div>
                </div>
                <div className="p-2 bg-amber-950/40 border border-amber-900/60 rounded">
                  <div className="text-amber-400 font-bold text-sm">301</div>
                  <div className="text-[10px] text-gray-400 uppercase font-semibold">⚔️ Combates (Amarillo)</div>
                </div>
                <div className="p-2 bg-emerald-950/40 border border-emerald-900/60 rounded">
                  <div className="text-emerald-400 font-bold text-sm">319</div>
                  <div className="text-[10px] text-gray-400 uppercase font-semibold">🟢 Neutro (Cuadrado)</div>
                </div>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-gray-700/80">
                <span className="text-[11px] text-gray-400">
                  Controla la visualización tridimensional en el HUD del mapa (filtros por año y por estructura).
                </span>
                <button
                  onClick={() => {
                    eventBus.publish('panToLocationAndShowInfo', {
                      location: { lat: 1.4122, lon: -78.5478 },
                      displayName: 'Epicentro Histórico Factores de Inestabilidad (Tumaco - BR23)',
                      placeType: 'HISTORICO FACTORES DE INESTABILIDAD'
                    });
                  }}
                  className="px-2.5 py-1 bg-amber-800 hover:bg-amber-700 text-amber-100 rounded text-[10px] font-bold transition flex items-center gap-1 shadow"
                >
                  <span>📍</span> Centrar en Foco Principal
                </button>
              </div>
            </div>
          </div>
        )}

        {/* PASO 4 */}
        {activeStep === 4 && (
          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-sm text-lime-400 flex items-center gap-1.5">
                <span>⚔️</span> Paso 4: Determinar Cursos de Acción del Enemigo (Cap. 6 MTE 2-01.3)
              </h4>
              <span className="text-[10px] text-lime-300 font-mono bg-lime-950/60 px-2 py-0.5 rounded border border-lime-800/50">
                MLCOA / MDCOA
              </span>
            </div>
            <p className="text-gray-300">
              Formulación de los dos cursos de acción de la amenaza exigidos doctrinalmente, vinculados a la Matriz y Calco de Eventos:
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* MLCOA */}
              <div className="bg-gray-800/90 p-3 rounded-lg border border-lime-800/60 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-lime-400">MLCOA: Curso Más Probable</span>
                  <span className="text-[10px] bg-lime-950 text-lime-300 px-2 py-0.5 rounded border border-lime-700/50">
                    65% Probabilidad
                  </span>
                </div>
                <p className="text-[11px] text-gray-300">
                  <span className="font-semibold text-gray-200">Concepto:</span> El enemigo evitará el combate frontal abierto; replegará a sus cabecillas hacia las zonas de bosque de galería y empleará francotiradores y artefactos explosivos improvisados (AEI) en los ejes viales para retardar el avance de las tropas propias.
                </p>
                <div className="p-2 bg-gray-900 rounded text-[10px] text-gray-400 space-y-1">
                  <div><span className="font-bold text-gray-300">Áreas Nombradas de Interés (ANI):</span> ANI-1 (Vado del río), ANI-2 (Encrucijada veredal).</div>
                  <div><span className="font-bold text-gray-300">Línea de Coordinación (ICL):</span> ICL Tigre sobre cota 1200.</div>
                </div>
              </div>

              {/* MDCOA */}
              <div className="bg-gray-800/90 p-3 rounded-lg border border-rose-800/60 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-rose-400">MDCOA: Curso Más Peligroso</span>
                  <span className="text-[10px] bg-rose-950 text-rose-300 px-2 py-0.5 rounded border border-rose-700/50">
                    35% Probabilidad
                  </span>
                </div>
                <p className="text-[11px] text-gray-300">
                  <span className="font-semibold text-gray-200">Concepto:</span> La estructura hostil ejecuta un ataque simultáneo a la base de patrulla mediante drones armados con granadas de 60mm y activa emboscadas combinadas sobre la ruta de abastecimiento (Clase I y V), buscando provocar bajas múltiples y generar confinamiento de la población civil para impedir el apoyo aéreo.
                </p>
                <div className="p-2 bg-gray-900 rounded text-[10px] text-gray-400 space-y-1">
                  <div><span className="font-bold text-gray-300">Áreas Blancos de Interés (ABI):</span> ABI-1 (Posición de lanzamiento de morteros).</div>
                  <div><span className="font-bold text-gray-300">Puntos de Decisión (DP):</span> DP-1 (Activación de reserva y apoyo aéreo CAS).</div>
                </div>
              </div>
            </div>

            {/* Botones de Acción Táctica */}
            <div className="flex flex-col gap-2 pt-2 border-t border-gray-800">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={handleGraficarMedidasS2}
                  className="px-3.5 py-2 bg-gradient-to-r from-rose-700 to-rose-600 hover:from-rose-600 hover:to-rose-500 text-white rounded font-bold text-xs flex items-center gap-2 shadow-lg transition transform active:scale-95"
                >
                  <PencilIcon className="w-4 h-4" />
                  Graficar Medidas S2 en Cesium 3D (MFRE 1-02.2)
                </button>
                <button
                  onClick={() => {
                    if (onActivateTemplate) onActivateTemplate(PlantillaType.INTELIGENCIA_ENEMIGA);
                    eventBus.publish('setTemplateContext', PlantillaType.INTELIGENCIA_ENEMIGA);
                    if (onSelectStepTool) onSelectStepTool('PICC_S2_TOOL');
                    setS2Feedback('ℹ️ Plantilla S2 activada en el panel inferior: selecciona un elemento para trazar en el mapa 3D.');
                    setTimeout(() => setS2Feedback(null), 6000);
                  }}
                  className="px-3 py-2 bg-gray-800 hover:bg-gray-700 text-rose-300 border border-rose-800/60 rounded font-medium text-xs flex items-center gap-1.5 transition"
                >
                  <span>✏️</span> Trazar Medida Manual
                </button>
                <button
                  onClick={handleClearMedidasGraficadas}
                  className="px-3 py-2 bg-slate-900 hover:bg-rose-950/80 text-rose-400 hover:text-rose-200 border border-rose-800/60 rounded font-medium text-xs flex items-center gap-1.5 transition shadow"
                  title="Eliminar del visor Cesium 3D las medidas S2 y calco táctico"
                >
                  <TrashIcon className="w-4 h-4 text-rose-400" />
                  Borrar Medidas Graficadas
                </button>
              </div>
              {s2Feedback && (
                <div className="text-[11px] text-lime-300 bg-lime-950/80 border border-lime-700/80 p-2 rounded animate-in fade-in flex items-center gap-2">
                  <SparklesIcon className="w-4 h-4 text-lime-400 shrink-0" />
                  <span>{s2Feedback}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
