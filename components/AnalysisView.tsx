import React, { useState, useCallback, useEffect } from 'react';
import L from 'leaflet';
import * as turf from '@turf/turf';
import { point as turfPoint, polygon as turfPolygonFunction } from '@turf/helpers';
import type { Feature as GeoJSONFeature, Polygon as GeoJSONPolygon } from 'geojson';
import type { MilitaryUnit, IntelligenceReport, GeminiAnalysisResult, SelectedEntity, NominatimResult, GeoLocation, PICCDrawConfig, PlantillaType as PlantillaTypeEnum, PICCToolDefinition, COAPlan } from '../types';
import { MapEntityType, PlantillaType } from '../types';
import { getGeminiAnalysis, generateCOAPlan, getDoctrinalAssistantResponse, simulateCOAOutcome } from '../utils/geminiService';
import { coaPlanService } from '../services/coaPlanService';
import { RulerIcon } from './icons/RulerIcon';
import { PencilIcon } from './icons/PencilIcon';
import { MagnifyingGlassIcon } from './icons/MagnifyingGlassIcon';
import { ExclamationTriangleIcon } from './icons/ExclamationTriangleIcon';
import { TrashIcon } from './icons/TrashIcon';
import { ChartBarIcon } from './icons/ChartBarIcon';
import { AcademicCapIcon } from './icons/AcademicCapIcon';
import { EyeIcon } from './icons/EyeIcon';
import { PlantillaPICCConfig } from '../utils/piccConfig';

interface EventEmitter {
  publish(event: string, data?: any): void;
  subscribe(event: string, callback: (...args: any[]) => void): string;
  unsubscribe(token: string): void;
}

interface ElevationPoint {
  distance: number; // distance along the profile in meters
  elevation: number; // elevation in meters
}

interface ElevationProfileChartProps {
  data: ElevationPoint[];
}

const ElevationProfileChart: React.FC<ElevationProfileChartProps> = ({ data }) => {
  if (!data || data.length < 2) return null;

  const padding = { top: 20, right: 20, bottom: 30, left: 40 };
  const svgWidth = 500;
  const svgHeight = 200;

  const maxX = Math.max(...data.map(p => p.distance));
  const minY = Math.min(...data.map(p => p.elevation));
  const maxY = Math.max(...data.map(p => p.elevation));

  const xScale = (svgWidth - padding.left - padding.right) / maxX;
  const yScale = (svgHeight - padding.top - padding.bottom) / (maxY - minY);

  const pathData = data
    .map((p, i) => {
      const x = padding.left + p.distance * xScale;
      const y = svgHeight - padding.bottom - (p.elevation - minY) * yScale;
      return `${i === 0 ? 'M' : 'L'} ${x},${y}`;
    })
    .join(' ');

  const xAxisLabels = Array.from({ length: 5 }, (_, i) => {
    const dist = (i * maxX) / 4;
    return (
      <text key={`x-label-${i}`} x={padding.left + dist * xScale} y={svgHeight - padding.bottom + 15} fill="#9ca3af" fontSize="10" textAnchor="middle">
        {(dist / 1000).toFixed(1)}km
      </text>
    );
  });
  const yAxisLabels = Array.from({ length: 4 }, (_, i) => {
    const elev = minY + (i * (maxY - minY)) / 3;
    return (
      <text key={`y-label-${i}`} x={padding.left - 5} y={svgHeight - padding.bottom - (elev - minY) * yScale + 3} fill="#9ca3af" fontSize="10" textAnchor="end">
        {Math.round(elev)}m
      </text>
    );
  });

  return (
    <div className="w-full bg-gray-900 p-2 rounded-md mt-4">
      <h5 className="text-center text-sm font-semibold text-gray-300 mb-1">Perfil de Elevación del Trazado</h5>
      <svg width="100%" height="100%" viewBox={`0 0 ${svgWidth} ${svgHeight}`}>
        {/* Axes */}
        <line x1={padding.left} y1={padding.top} x2={padding.left} y2={svgHeight - padding.bottom} stroke="#6b7280" strokeWidth="1" />
        <line x1={padding.left} y1={svgHeight - padding.bottom} x2={svgWidth - padding.right} y2={svgHeight - padding.bottom} stroke="#6b7280" strokeWidth="1" />
        {xAxisLabels}
        {yAxisLabels}
        <path d={pathData} fill="url(#profileGradient)" stroke="#60a5fa" strokeWidth="1.5" />
        <defs>
          <linearGradient id="profileGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#60a5fa" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#60a5fa" stopOpacity="0" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
};

interface AnalysisViewProps {
  units: MilitaryUnit[];
  intelligenceReports: IntelligenceReport[];
  distanceToolActive: boolean;
  setDistanceToolActive: (active: boolean) => void;
  aoiDrawingModeActive: boolean;
  setAoiDrawingModeActive: (active: boolean) => void;
  enemyInfluenceLayerActive: boolean;
  setEnemyInfluenceLayerActive: (active: boolean) => void;
  elevationProfileActive: boolean;
  setElevationProfileActive: (active: boolean) => void;
  piccDrawingConfig: PICCDrawConfig | null;
  setPiccDrawingConfig: (config: PICCDrawConfig | null) => void;
  onSelectEntityOnMap?: (entity: SelectedEntity | null) => void;
  activeTemplateContext: PlantillaTypeEnum | null;
  setActiveTemplateContext: (template: PlantillaTypeEnum | null) => void;
  eventBus: EventEmitter;
}

interface AoiStats {
  areaKm2: number;
  unitsInAoi: MilitaryUnit[];
  intelInAoi: IntelligenceReport[];
}

export const AnalysisView: React.FC<AnalysisViewProps> = ({
  units,
  intelligenceReports,
  distanceToolActive,
  setDistanceToolActive,
  aoiDrawingModeActive,
  setAoiDrawingModeActive,
  enemyInfluenceLayerActive,
  setEnemyInfluenceLayerActive,
  elevationProfileActive,
  setElevationProfileActive,
  piccDrawingConfig,
  setPiccDrawingConfig,
  onSelectEntityOnMap,
  activeTemplateContext,
  setActiveTemplateContext,
  eventBus,
}) => {
  const [query, setQuery] = useState<string>('');
  const [useGoogleSearch, setUseGoogleSearch] = useState<boolean>(false);
  const [analysisResult, setAnalysisResult] = useState<GeminiAnalysisResult | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [aoiPoints, setAoiPoints] = useState<L.LatLng[]>([]);
  const [finalizedAoiGeoJson, setFinalizedAoiGeoJson] = useState<GeoJSONFeature<GeoJSONPolygon> | null>(null);
  const [aoiStats, setAoiStats] = useState<AoiStats | null>(null);
  const [aoiError, setAoiError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchResults, setSearchResults] = useState<NominatimResult[] | null>(null);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [elevationData, setElevationData] = useState<ElevationPoint[] | null>(null);
  const [isFetchingElevation, setIsFetchingElevation] = useState<boolean>(false);
  const [coaObjective, setCoaObjective] = useState<string>('');
  const [isGeneratingCOA, setIsGeneratingCOA] = useState<boolean>(false);
  const [coaPlan, setCoaPlan] = useState<COAPlan | null>(null);
  const [coaError, setCoaError] = useState<string | null>(null);
  const [doctrinalQuery, setDoctrinalQuery] = useState('');
  const [doctrinalResponse, setDoctrinalResponse] = useState<GeminiAnalysisResult | null>(null);
  const [isFetchingDoctrine, setIsFetchingDoctrine] = useState(false);
  const [doctrinalError, setDoctrinalError] = useState<string | null>(null);
  const [isSimulatingCOA, setIsSimulatingCOA] = useState<boolean>(false);
  const [simulationResult, setSimulationResult] = useState<GeminiAnalysisResult | null>(null);
  const [simulationError, setSimulationError] = useState<string | null>(null);

  // New state for Line of Sight Tool
  const [lineOfSightActive, setLineOfSightActive] = useState<boolean>(false);
  // New state for Slope Analysis Tool
  const [slopeAnalysisActive, setSlopeAnalysisActive] = useState<boolean>(false);

  const currentPICCtools: PICCToolDefinition[] = activeTemplateContext ? PlantillaPICCConfig[activeTemplateContext]?.elements || [] : [];

  const deactivateOtherTools = useCallback(() => {
    if (distanceToolActive) setDistanceToolActive(false);
    if (aoiDrawingModeActive) setAoiDrawingModeActive(false);
    if (elevationProfileActive) setElevationProfileActive(false);
    if (lineOfSightActive) setLineOfSightActive(false);
    if (slopeAnalysisActive) setSlopeAnalysisActive(false);
    if (searchResults) setSearchResults(null);
    eventBus.publish('clearGeospatialSearchMarkers');
    eventBus.publish('clearAoiLayer');
    eventBus.publish('clearElevationProfileLayer');
    eventBus.publish('clearLosLayer'); // Assuming you'll handle this event in map
  }, [distanceToolActive, aoiDrawingModeActive, elevationProfileActive, lineOfSightActive, slopeAnalysisActive, searchResults, setDistanceToolActive, setAoiDrawingModeActive, setElevationProfileActive, eventBus]);

  const handleSubmitAnalysis = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) {
      setError("Por favor, ingrese una consulta para el análisis.");
      return;
    }
    setIsLoading(true);
    setError(null);
    setAnalysisResult(null);

    deactivateOtherTools();

    try {
      const result = await getGeminiAnalysis(query, units, intelligenceReports, useGoogleSearch, enemyInfluenceLayerActive);
      setAnalysisResult(result);
    } catch (err: any) {
      setError(err.message || "Ocurrió un error inesperado durante el análisis.");
    } finally {
      setIsLoading(false);
    }
  }, [query, units, intelligenceReports, useGoogleSearch, enemyInfluenceLayerActive, deactivateOtherTools]);

  const handleSubmitCOA = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!coaObjective.trim()) {
      setCoaError("Por favor, describa el objetivo del Curso de Acción.");
      return;
    }
    setIsGeneratingCOA(true);
    setCoaError(null);
    setCoaPlan(null);
    eventBus.publish('clearCOALayer');

    try {
      // Generate COA with AI
      const result = await generateCOAPlan(coaObjective, units, intelligenceReports);

      // Save to database
      try {
        const savedPlan = await coaPlanService.savePlan({
          ...result,
          createdByUserId: 'current-user', // TODO: Get from auth context
        });
        console.log('✅ COA Plan guardado en BD:', savedPlan.id);
        setCoaPlan(savedPlan);
        eventBus.publish('newCOAPlan', savedPlan);
      } catch (saveError: any) {
        console.error('⚠️ Error guardando COA en BD:', saveError);
        // Still show the plan even if save fails
        setCoaPlan(result);
        eventBus.publish('newCOAPlan', result);
      }
    } catch (err: any) {
      setCoaError(err.message || "Ocurrió un error inesperado al generar el COA.");
    } finally {
      setIsGeneratingCOA(false);
    }
  };

  const handleSimulateCOA = async () => {
    if (!coaPlan) return;
    setIsSimulatingCOA(true);
    setSimulationError(null);
    setSimulationResult(null);

    try {
      const result = await simulateCOAOutcome(coaPlan, units, intelligenceReports);
      setSimulationResult(result);
    } catch (err: any) {
      setSimulationError(err.message || "Error al simular el resultado.");
    } finally {
      setIsSimulatingCOA(false);
    }
  };

  const handleDoctrinalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!doctrinalQuery.trim()) {
      setDoctrinalError("Por favor, ingrese una pregunta doctrinal.");
      return;
    }
    setIsFetchingDoctrine(true);
    setDoctrinalError(null);
    setDoctrinalResponse(null);
    try {
      const result = await getDoctrinalAssistantResponse(doctrinalQuery);
      setDoctrinalResponse(result);
    } catch (err: any) {
      setDoctrinalError(err.message || "Ocurrió un error al consultar al asistente.");
    } finally {
      setIsFetchingDoctrine(false);
    }
  };


  const toggleDistanceTool = () => {
    deactivateOtherTools();
    setDistanceToolActive(!distanceToolActive);
  };

  const toggleEnemyInfluenceLayer = () => {
    if (piccDrawingConfig) setPiccDrawingConfig(null);
    setEnemyInfluenceLayerActive(!enemyInfluenceLayerActive);
  };

  const toggleAoiDrawingMode = () => {
    deactivateOtherTools();
    if (aoiDrawingModeActive) {
      handleFinalizeAoi();
    } else {
      setAoiDrawingModeActive(true);
      setAoiPoints([]);
      setFinalizedAoiGeoJson(null);
      setAoiStats(null);
      setAoiError(null);
      eventBus.publish('clearAoiLayer');
    }
  };

  const handleFinalizeAoi = () => {
    setAoiDrawingModeActive(false);
    if (aoiPoints.length < 3) {
      setAoiError("Se necesitan al menos 3 puntos para definir un área.");
      setAoiPoints([]);
      eventBus.publish('clearAoiLayer');
      return;
    }
    const coordinates = [...aoiPoints.map(p => [p.lng, p.lat]), [aoiPoints[0].lng, aoiPoints[0].lat]];
    const polygonGeoJson = turfPolygonFunction([coordinates]) as GeoJSONFeature<GeoJSONPolygon>;
    setFinalizedAoiGeoJson(polygonGeoJson);

    const areaM2 = turf.area(polygonGeoJson);
    const unitsInAoi = units.filter(unit => turf.booleanPointInPolygon(turfPoint([unit.location.lon, unit.location.lat]), polygonGeoJson));
    const intelInAoi = intelligenceReports.filter(intel => turf.booleanPointInPolygon(turfPoint([intel.location.lon, intel.location.lat]), polygonGeoJson));

    setAoiStats({ areaKm2: areaM2 / 1000000, unitsInAoi, intelInAoi });
    setAoiError(null);
    eventBus.publish('finalizeAoiLayer', polygonGeoJson);
  };

  const handleClearAoi = () => {
    setAoiDrawingModeActive(false);
    setAoiPoints([]);
    setFinalizedAoiGeoJson(null);
    setAoiStats(null);
    setAoiError(null);
    eventBus.publish('clearAoiLayer');
  };

  useEffect(() => {
    const handleMapClickForAoi = (_msg: string, latlng: L.LatLng) => {
      if (aoiDrawingModeActive) {
        setAoiPoints(prevPoints => [...prevPoints, latlng]);
        setAoiError(null);
        eventBus.publish('updateAoiDrawingLayer', [...aoiPoints, latlng]);
      }
    };

    const token = eventBus.subscribe('mapClickForAoi', handleMapClickForAoi);
    return () => {
      eventBus.unsubscribe(token);
    };
  }, [aoiDrawingModeActive, aoiPoints, eventBus]);

  // Elevation Profile Logic (Existing + Fixed)
  const handleElevationProfileLine = async (_msg: string, { latlngs }: { latlngs: L.LatLng[] }) => {
    if (!elevationProfileActive || latlngs.length < 2) return;

    setIsFetchingElevation(true);
    setElevationProfileActive(false); // Deactivate tool after drawing
    setElevationData(null);

    try {
      const line = turf.lineString(latlngs.map(ll => [ll.lng, ll.lat]));
      const totalDistance = turf.length(line, { units: 'meters' });
      const steps = 30;
      const locations: { lat: number, lon: number }[] = [];
      const distances: number[] = [];

      for (let i = 0; i <= steps; i++) {
        const stepDistance = (i / steps) * totalDistance;
        const point = turf.along(line, stepDistance, { units: 'meters' });
        locations.push({ lat: point.geometry.coordinates[1], lon: point.geometry.coordinates[0] });
        distances.push(stepDistance);
      }

      const locationsString = locations.map(loc => `${loc.lat},${loc.lon}`).join('|');
      const response = await fetch(`https://api.open-elevation.com/api/v1/lookup?locations=${locationsString}`);
      if (!response.ok) throw new Error(`API de Elevación falló: ${response.statusText}`);

      const data = await response.json();
      if (!data.results || data.results.length === 0) throw new Error("La API de Elevación no retornó resultados.");

      const profileData: ElevationPoint[] = data.results.map((result: { elevation: number }, index: number) => ({
        distance: distances[index],
        elevation: result.elevation,
      }));

      setElevationData(profileData);
    } catch (err: any) {
      setError(`Error al obtener perfil de elevación: ${err.message}`);
      setElevationData(null);
    } finally {
      setIsFetchingElevation(false);
    }
  };

  // Line of Sight Logic (New)
  const handleLosLine = async (_msg: string, { latlngs }: { latlngs: L.LatLng[] }) => {
    if (!lineOfSightActive || latlngs.length < 2) return;

    const start = latlngs[0];
    const end = latlngs[latlngs.length - 1];

    setIsFetchingElevation(true);
    setLineOfSightActive(false);
    setElevationData(null);

    try {
      const line = turf.lineString([[start.lng, start.lat], [end.lng, end.lat]]);
      const totalDistance = turf.length(line, { units: 'meters' });
      const steps = 50;
      const locations: { lat: number, lon: number }[] = [];
      const distances: number[] = [];

      for (let i = 0; i <= steps; i++) {
        const stepDistance = (i / steps) * totalDistance;
        const point = turf.along(line, stepDistance, { units: 'meters' });
        locations.push({ lat: point.geometry.coordinates[1], lon: point.geometry.coordinates[0] });
        distances.push(stepDistance);
      }

      const locationsString = locations.map(loc => `${loc.lat},${loc.lon}`).join('|');
      const response = await fetch(`https://api.open-elevation.com/api/v1/lookup?locations=${locationsString}`);
      if (!response.ok) throw new Error(`API LOS falló: ${response.statusText}`);

      const data = await response.json();
      if (!data.results || data.results.length === 0) throw new Error("No elevation data.");

      const points = data.results.map((r: any, i: number) => ({
        dist: distances[i],
        elev: r.elevation
      }));

      // LOS Calculation
      const obsHeight = 2; // meters
      const targetHeight = 2; // meters
      const p0 = points[0];
      const pn = points[points.length - 1];

      const obsElev = p0.elev + obsHeight;
      const targetElev = pn.elev + targetHeight;

      // Slope (m/m) from Obs to Target
      const totalSlope = (targetElev - obsElev) / totalDistance;

      let blocked = false;
      let blockerIndex = -1;

      for (let i = 1; i < points.length - 1; i++) {
        const p = points[i];
        const lineElev = obsElev + (totalSlope * p.dist);
        if (p.elev > lineElev) {
          blocked = true;
          blockerIndex = i;
          break;
        }
      }

      const profileData: ElevationPoint[] = points.map((p: any) => ({
        distance: p.dist,
        elevation: p.elev
      }));
      setElevationData(profileData);

      eventBus.publish('drawLosResult', {
        start, end, blocked,
        blockerLocation: blocked ? locations[blockerIndex] : null
      });

      alert(blocked
        ? `LÍNEA DE VISTA BLOQUEADA.\nObstrucción detectada a ${(distances[blockerIndex] / 1000).toFixed(2)}km del observador.`
        : `LÍNEA DE VISTA DESPEJADA.\nEl objetivo es visible.`);

    } catch (err: any) {
      setError(`Error cálculo LOS: ${err.message}`);
    } finally {
      setIsFetchingElevation(false);
    }
  };



  // Toggle functions
  const toggleElevationProfileTool = () => {
    deactivateOtherTools();
    setElevationData(null);
    setIsFetchingElevation(false);
    setElevationProfileActive(!elevationProfileActive);
  };

  const toggleLosTool = () => {
    deactivateOtherTools();
    setElevationData(null);
    setIsFetchingElevation(false);
    setLineOfSightActive(!lineOfSightActive);
    // We reuse the 'elevationProfileActive' drawing mode in Map component for simplicity, 
    // or trigger a specific mode if needed. 
    // For now, let's treat LOS drawing same as Elevation drawing (just drawing a line)
    // We need to tell the Map component to enable drawing mode.
    // Re-using setElevationProfileActive(true) might be confusing visually (purple vs ?).
    // Ideally we pass "losActive" to AnalysisView props -> Map.
    // But since we are inside AnalysisView and props are fixed, we might need to hijack 'elevationProfileActive' 
    // OR rely on Map listening to a 'startLosDraw' event?
    // Actually, simplest is to use the existing prop `elevationProfileActive` to enable the L.Draw on the map,
    // but manage LOCALLY which logic runs (LOS vs Profile) based on our local state `lineOfSightActive`.
    // BUT `elevationProfileActive` is a PROP controlled by parent. We can't set it directly easily if it's passed down only?
    // Wait, setElevationProfileActive is passed down.
    // So:
    if (!lineOfSightActive) {
      setElevationProfileActive(true); // Enable map drawing
      // But we need to distinguish. 
      // We set local `lineOfSightActive` ONLY.
      // AND we need to tell Map to enable drawing.
      // If the Map component strictly listens to `elevationProfileActive` prop to enable L.Draw,
      // then we MUST set that to true.
      // But then how do we know if it's Profile or LOS? 
      // We check `lineOfSightActive` in the Subscription callback!
      // Wait, if I set elevationProfileActive=true, the UI button for Profile will light up.
      // I should request user to add `isLosActive` to Map props in next step if I can't hack it.
      // HACK: I will use `setElevationProfileActive(true)` to trigger the map drawing, 
      // but I will set a local flag `lineOfSightActive` so when the event comes back, I process it as LOS.
    } else {
      setElevationProfileActive(false);
    }
  };

  const toggleSlopeAnalysisTool = () => {
    deactivateOtherTools();
    setElevationData(null);
    setIsFetchingElevation(false);
    setSlopeAnalysisActive(!slopeAnalysisActive);

    if (!slopeAnalysisActive) {
      setElevationProfileActive(true); // Trigger Map draw mode
    } else {
      setElevationProfileActive(false);
    }
  };

  // Slope Analysis Logic
  const handleSlopeLine = async (_msg: string, { latlngs }: { latlngs: L.LatLng[] }) => {
    if (!slopeAnalysisActive || latlngs.length < 2) return;

    setIsFetchingElevation(true);
    setSlopeAnalysisActive(false);
    setElevationData(null);

    try {
      const line = turf.lineString(latlngs.map(ll => [ll.lng, ll.lat]));
      const totalDistance = turf.length(line, { units: 'meters' });
      // Sampling steps (e.g. every 50m or 100m)
      const steps = Math.max(20, Math.floor(totalDistance / 100));
      const locations: { lat: number, lon: number }[] = [];
      const distances: number[] = [];

      for (let i = 0; i <= steps; i++) {
        const stepDistance = (i / steps) * totalDistance;
        const point = turf.along(line, stepDistance, { units: 'meters' });
        locations.push({ lat: point.geometry.coordinates[1], lon: point.geometry.coordinates[0] });
        distances.push(stepDistance);
      }

      const locationsString = locations.map(loc => `${loc.lat},${loc.lon}`).join('|');
      const response = await fetch(`https://api.open-elevation.com/api/v1/lookup?locations=${locationsString}`);
      if (!response.ok) throw new Error(`API Pendiente falló: ${response.statusText}`);

      const data = await response.json();
      if (!data.results) throw new Error("No elevation data.");

      const points = data.results.map((r: any, i: number) => ({ dist: distances[i], elev: r.elevation }));

      // Calculate segments with slope
      const segments = [];
      let maxSlope = 0;
      let totalSlopeAbs = 0;

      for (let i = 0; i < points.length - 1; i++) {
        const p1 = points[i];
        const p2 = points[i + 1];
        const dDist = p2.dist - p1.dist;
        const dElev = p2.elev - p1.elev;

        if (dDist <= 0) continue;

        const slopePercent = (dElev / dDist) * 100;
        segments.push({
          start: [locations[i].lat, locations[i].lon],
          end: [locations[i + 1].lat, locations[i + 1].lon],
          slope: slopePercent
        });

        if (Math.abs(slopePercent) > maxSlope) maxSlope = Math.abs(slopePercent);
        totalSlopeAbs += Math.abs(slopePercent);
      }

      const avgSlope = totalSlopeAbs / segments.length;

      eventBus.publish('drawSlopeResult', { segments });

      alert(`ANÁLISIS DE PENDIENTE COMPLETADO:\n\nPendiente Máxima: ${maxSlope.toFixed(1)}%\nPendiente Promedio: ${avgSlope.toFixed(1)}%\n\nVer mapa para codificación de colores:\n- Verde: <5% (Fácil)\n- Amarillo: 5-15% (Moderado)\n- Rojo: >15% (Difícil/Impedimento)`);

    } catch (err: any) {
      setError(`Error análisis pendiente: ${err.message}`);
    } finally {
      setIsFetchingElevation(false);
    }
  };

  // UseEffect to subscribe to draw events (Moved here to avoid used-before-declaration error)
  useEffect(() => {
    const token = eventBus.subscribe('elevationProfileDrawn', (msg: string, data: any) => {
      if (elevationProfileActive) handleElevationProfileLine(msg, data);
      else if (lineOfSightActive) handleLosLine(msg, data);
      else if (slopeAnalysisActive) handleSlopeLine(msg, data);
    });
    return () => eventBus.unsubscribe(token);
  }, [elevationProfileActive, lineOfSightActive, slopeAnalysisActive, eventBus, handleElevationProfileLine, handleLosLine, handleSlopeLine]);


  const handleGeospatialSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) {
      setSearchError("Ingrese un término de búsqueda.");
      setSearchResults(null);
      return;
    }
    setIsSearching(true);
    setSearchError(null);
    setSearchResults(null);

    deactivateOtherTools();
    eventBus.publish('clearGeospatialSearchMarkers');


    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&countrycodes=co&limit=5&addressdetails=1`
      );
      if (!response.ok) {
        throw new Error(`Error de red: ${response.status}`);
      }
      const data: NominatimResult[] = await response.json();
      if (data.length === 0) {
        setSearchError("No se encontraron resultados para su búsqueda en Colombia.");
      } else {
        setSearchResults(data);
      }
    } catch (err: any) {
      setSearchError(err.message || "Error al buscar lugares.");
      console.error("Error en búsqueda geoespacial:", err);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSearchResultClick = (result: NominatimResult) => {
    const location: GeoLocation = { lat: parseFloat(result.lat), lon: parseFloat(result.lon) };
    eventBus.publish('panToLocationAndShowInfo', {
      location,
      displayName: result.display_name,
      placeType: result.type || result.category || 'Lugar'
    });
  };

  useEffect(() => {
    return () => {
      eventBus.publish('clearGeospatialSearchMarkers');
    };
  }, [eventBus]);

  const handlePiccToolSelect = (toolDef: PICCToolDefinition) => {
    deactivateOtherTools();

    const newConfig: PICCDrawConfig = {
      type: toolDef.type,
      options: toolDef.defaultOptions
    };
    setPiccDrawingConfig(newConfig);
  };

  const handleCancelPiccDrawing = () => {
    setPiccDrawingConfig(null);
  };

  const handleClearActiveTemplateLayer = () => {
    if (activeTemplateContext) {
      if (window.confirm(`¿Está seguro de que desea eliminar todos los gráficos de la plantilla "${activeTemplateContext}"?`)) {
        eventBus.publish('clearPiccLayer', activeTemplateContext);
        if (piccDrawingConfig) setPiccDrawingConfig(null);
      }
    } else {
      alert("Por favor, seleccione una plantilla activa para limpiar sus gráficos.");
    }
  };


  return (
    <div className="flex flex-col space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-center border-b border-gray-700 pb-3 gap-3">
        <h2 className="text-2xl font-semibold text-gray-200">
          Análisis Operacional y Geoespacial
        </h2>
      </div>

      <div className="bg-gray-800 p-4 rounded-lg shadow-md">
        <h3 className="text-lg font-semibold text-purple-300 mb-2 flex items-center">
          <AcademicCapIcon className="w-5 h-5 mr-2" />
          Asistente Doctrinal (Copiloto Cognitivo)
        </h3>
        <form onSubmit={handleDoctrinalSubmit} className="space-y-3">
          <div>
            <label htmlFor="doctrinalQuery" className="block text-xs font-medium text-gray-300 mb-1">
              Consulta sobre doctrina del Ejército de Colombia (EJC):
            </label>
            <textarea
              id="doctrinalQuery" value={doctrinalQuery} onChange={(e) => setDoctrinalQuery(e.target.value)}
              rows={2}
              className="w-full p-2 bg-gray-700 border border-gray-600 rounded-md shadow-sm placeholder-gray-400 text-gray-100 text-sm"
              placeholder="Ej: ¿Cuáles son los pasos del PLT (Proceso de Liderazgo de Tropa)? o 'generar checklist para una misión de registro y control de área'"
              disabled={isFetchingDoctrine}
            />
          </div>
          <div className="flex justify-end">
            <button
              type="submit" disabled={isFetchingDoctrine}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-md shadow-md text-sm transition-colors disabled:opacity-50"
            >
              {isFetchingDoctrine ? 'Consultando...' : 'Consultar Doctrina'}
            </button>
          </div>
        </form>
        {doctrinalError && <p className="mt-2 text-sm text-red-400 bg-red-900 p-2 rounded">{doctrinalError}</p>}
        {doctrinalResponse && (
          <div className="mt-4 p-3 bg-gray-750 rounded-lg shadow-inner text-sm">
            <div
              className="prose prose-sm prose-invert max-w-none whitespace-pre-wrap break-words"
              dangerouslySetInnerHTML={{ __html: doctrinalResponse.text.replace(/\n/g, '<br />') }}
            />
          </div>
        )}
      </div>

      <div className="bg-gray-800 p-4 rounded-lg shadow-md">
        <h3 className="text-lg font-semibold text-lime-300 mb-2">Planificador de Cursos de Acción (COA) con IA</h3>
        <form onSubmit={handleSubmitCOA} className="space-y-3">
          <div>
            <label htmlFor="coaObjective" className="block text-xs font-medium text-gray-300 mb-1">
              Describa la intención o el objetivo de la operación:
            </label>
            <textarea
              id="coaObjective" value={coaObjective} onChange={(e) => setCoaObjective(e.target.value)}
              rows={2}
              className="w-full p-2 bg-gray-700 border border-gray-600 rounded-md shadow-sm placeholder-gray-400 text-gray-100 text-sm"
              placeholder="Ej: Planear un asalto sobre el Objetivo Zafiro con dos pelotones, estableciendo una base de fuegos."
              disabled={isGeneratingCOA}
            />
          </div>
          <div className="flex justify-end">
            <button
              type="submit" disabled={isGeneratingCOA}
              className="px-4 py-2 bg-lime-600 hover:bg-lime-700 text-white font-semibold rounded-md shadow-md text-sm transition-colors disabled:opacity-50"
            >
              {isGeneratingCOA ? 'Generando Plan...' : 'Generar Plan de Maniobra'}
            </button>
          </div>
        </form>
        {coaError && <p className="mt-2 text-sm text-red-400 bg-red-900 p-2 rounded">{coaError}</p>}
        {coaPlan && (
          <div className="mt-4 p-3 bg-gray-750 rounded-lg shadow-inner space-y-3 text-sm">
            <h4 className="font-bold text-lime-200">{coaPlan.planName}</h4>
            <p className="whitespace-pre-wrap">{coaPlan.conceptOfOperations}</p>
            {coaPlan.phases.map((phase, index) => (
              <div key={index} className="pt-2 border-t border-gray-600">
                <p className="font-semibold text-gray-300">{phase.phaseName}</p>
                <p className="text-xs text-gray-400 whitespace-pre-wrap">{phase.description}</p>
              </div>
            ))}

            <div className="pt-3 border-t border-gray-600 flex flex-col space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-400 italic">Plan generado con IA. ¿Desea simular el resultado probable?</span>
                <button
                  onClick={handleSimulateCOA}
                  disabled={isSimulatingCOA}
                  className="px-3 py-1.5 bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold rounded shadow transition-colors disabled:opacity-50"
                >
                  {isSimulatingCOA ? 'Simulando...' : 'Ejecutar Wargaming / Simulación'}
                </button>
              </div>

              {simulationError && <p className="text-xs text-red-400 bg-red-900/50 p-2 rounded">{simulationError}</p>}

              {simulationResult && (
                <div className="p-3 bg-orange-900/20 border border-orange-800 rounded-md">
                  <h5 className="font-bold text-orange-300 mb-2 flex items-center">
                    <ExclamationTriangleIcon className="w-4 h-4 mr-2" />
                    Resultado Estimado de la Simulación
                  </h5>
                  <div
                    className="prose prose-sm prose-invert max-w-none text-gray-200"
                    dangerouslySetInnerHTML={{ __html: simulationResult.text.replace(/\n/g, '<br />') }}
                  />
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="bg-gray-800 p-3 rounded-lg shadow-md">
        <h3 className="text-md font-semibold text-gray-300 mb-2">Herramientas de Mapa Interactivas</h3>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={toggleDistanceTool}
            className={`px-3 py-1.5 text-xs font-medium rounded-md shadow-sm flex items-center transition-colors
                            ${distanceToolActive
                ? 'bg-red-600 hover:bg-red-700 text-white'
                : 'bg-teal-600 hover:bg-teal-700 text-white'}`}
            aria-pressed={distanceToolActive}
          >
            <RulerIcon className="w-4 h-4 mr-1.5" />
            {distanceToolActive ? 'Cancelar Medición' : 'Medir Distancia'}
          </button>
          <button
            onClick={toggleAoiDrawingMode}
            className={`px-3 py-1.5 text-xs font-medium rounded-md shadow-sm flex items-center transition-colors
                            ${aoiDrawingModeActive && !finalizedAoiGeoJson
                ? 'bg-yellow-500 hover:bg-yellow-600 text-black'
                : (finalizedAoiGeoJson ? 'bg-blue-700 hover:bg-blue-800 text-white' : 'bg-sky-600 hover:bg-sky-700 text-white')}`}
          >
            <PencilIcon className="w-4 h-4 mr-1.5" />
            {aoiDrawingModeActive && !finalizedAoiGeoJson ? 'Añadiendo Puntos AOI...' : (finalizedAoiGeoJson ? 'AOI Definida' : 'Dibujar AOI')}
          </button>

          <button
            onClick={toggleElevationProfileTool}
            className={`px-3 py-1.5 text-xs font-medium rounded-md shadow-sm flex items-center transition-colors
                            ${elevationProfileActive && !lineOfSightActive
                ? 'bg-purple-600 hover:bg-purple-700 text-white'
                : 'bg-purple-600 hover:bg-purple-700 text-white'}`}
            // Note: If reusing elevationProfileActive for LOS, this button might stay active visually. 
            // Better to differentiate or just accept it for now as "Drawing Tool Active".
            aria-pressed={elevationProfileActive && !lineOfSightActive}
          >
            <ChartBarIcon className="w-4 h-4 mr-1.5" />
            {elevationProfileActive && !lineOfSightActive ? 'Cancelar Perfil' : 'Perfil de Elevación'}
          </button>

          <button
            onClick={toggleLosTool}
            className={`px-3 py-1.5 text-xs font-medium rounded-md shadow-sm flex items-center transition-colors
                            ${lineOfSightActive
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                : 'bg-teal-600 hover:bg-teal-700 text-white'}`}
            aria-pressed={lineOfSightActive}
          >
            <EyeIcon className="w-4 h-4 mr-1.5" />
            {lineOfSightActive ? 'Cancelar LOS' : 'Chequear Línea de Vista (LOS)'}
          </button>

          <button
            onClick={toggleSlopeAnalysisTool}
            className={`px-3 py-1.5 text-xs font-medium rounded-md shadow-sm flex items-center transition-colors
                            ${slopeAnalysisActive
                ? 'bg-amber-600 hover:bg-amber-700 text-white'
                : 'bg-orange-500 hover:bg-orange-600 text-white'}`}
            aria-pressed={slopeAnalysisActive}
          >
            <ChartBarIcon className="w-4 h-4 mr-1.5" />
            {slopeAnalysisActive ? 'Cancelar Análisis' : 'Análisis de Pendiente'}
          </button>
          {(aoiDrawingModeActive && !finalizedAoiGeoJson && aoiPoints.length >= 3) && (
            <button
              onClick={handleFinalizeAoi}
              className="px-3 py-1.5 text-xs font-medium rounded-md shadow-sm flex items-center transition-colors bg-green-600 hover:bg-green-700 text-white"
            >
              Finalizar Dibujo AOI
            </button>
          )}
          {(aoiPoints.length > 0 || finalizedAoiGeoJson) && (
            <button
              onClick={handleClearAoi}
              className="px-3 py-1.5 text-xs font-medium rounded-md shadow-sm flex items-center transition-colors bg-red-600 hover:bg-red-700 text-white"
            >
              Limpiar AOI
            </button>
          )}
          <button
            onClick={toggleEnemyInfluenceLayer}
            className={`px-3 py-1.5 text-xs font-medium rounded-md shadow-sm flex items-center transition-colors
                            ${enemyInfluenceLayerActive
                ? 'bg-red-700 hover:bg-red-800 text-white'
                : 'bg-orange-600 hover:bg-orange-700 text-white'}`}
            aria-pressed={enemyInfluenceLayerActive}
          >
            <ExclamationTriangleIcon className="w-4 h-4 mr-1.5" />
            {enemyInfluenceLayerActive ? 'Ocultar Amenaza Enem.' : 'Ver Amenaza Enem.'}
          </button>
        </div>
      </div>

      <div className="bg-gray-800 p-4 rounded-lg shadow-md">
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-lg font-semibold text-lime-300 flex items-center">
            <PencilIcon className="w-5 h-5 mr-2" />
            Planeamiento Operacional (PICC)
          </h3>
          <div className="flex items-center space-x-2">
            <button
              onClick={handleClearActiveTemplateLayer}
              className="p-1.5 bg-red-700 hover:bg-red-800 rounded-md"
              title="Limpiar gráficos de la plantilla activa"
              disabled={!activeTemplateContext || !!piccDrawingConfig}
            >
              <TrashIcon className="w-4 h-4 text-white" />
            </button>
          </div>
        </div>

        <div className="mb-3">
          <label htmlFor="activeTemplate" className="block text-sm font-medium text-gray-300 mb-1">
            Seleccionar Plantilla Activa:
          </label>
          <select
            id="activeTemplate"
            value={activeTemplateContext || ''}
            onChange={(e) => setActiveTemplateContext(e.target.value as PlantillaTypeEnum || null)}
            className="w-full p-2 bg-gray-700 border border-gray-600 rounded-md shadow-sm text-gray-100 text-sm"
            disabled={!!piccDrawingConfig}
          >
            <option value="">-- Ninguna Plantilla Seleccionada --</option>
            {Object.keys(PlantillaPICCConfig).map(key => {
              const plantillaKey = key as PlantillaTypeEnum;
              return (
                <option key={plantillaKey} value={plantillaKey}>
                  {PlantillaPICCConfig[plantillaKey].label}
                </option>
              );
            })}
          </select>
          {activeTemplateContext && <p className="text-xs text-gray-400 mt-1">Plantilla activa para nuevos gráficos: {PlantillaPICCConfig[activeTemplateContext]?.label}</p>}
        </div>

        {activeTemplateContext && (
          <>
            <h4 className="text-md font-semibold text-gray-300 mb-2">Añadir Elemento Gráfico a Plantilla: "{PlantillaPICCConfig[activeTemplateContext]?.label}"</h4>
            {currentPICCtools.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                {currentPICCtools.map(toolDef => (
                  <button
                    key={toolDef.type}
                    onClick={() => handlePiccToolSelect(toolDef)}
                    disabled={!!piccDrawingConfig}
                    className={`p-2 text-xs font-medium rounded-md shadow-sm flex items-center justify-center transition-colors text-white disabled:opacity-50 disabled:cursor-not-allowed ${toolDef.colorClass} 
                                        ${piccDrawingConfig?.type === toolDef.type ? 'ring-2 ring-offset-2 ring-offset-gray-800 ring-white' : ''}`}
                    title={toolDef.label}
                  >
                    <toolDef.icon className="w-3.5 h-3.5 mr-1.5 shrink-0" />
                    <span className="truncate">{toolDef.label}</span>
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400">No hay herramientas de dibujo definidas para esta plantilla.</p>
            )}
          </>
        )}

        {piccDrawingConfig && (
          <div className="mt-3 text-center">
            <p className="text-sm text-yellow-300 mb-1">Modo de dibujo activo: {piccDrawingConfig.type}</p>
            <button
              onClick={handleCancelPiccDrawing}
              className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-xs font-medium rounded-md"
            >
              Cancelar Dibujo
            </button>
          </div>
        )}
      </div>

      <div className="bg-gray-800 p-4 rounded-lg shadow-md">
        <h3 className="text-lg font-semibold text-cyan-300 mb-2 flex items-center">
          <MagnifyingGlassIcon className="w-5 h-5 mr-2" /> Buscador Geoespacial (Colombia)
        </h3>
        <form onSubmit={handleGeospatialSearch} className="flex flex-col sm:flex-row gap-2 items-center">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar ciudad, municipio, vereda..."
            className="flex-grow p-2 bg-gray-700 border border-gray-600 rounded-md shadow-sm text-gray-100 text-sm placeholder-gray-400"
            aria-label="Término de búsqueda geoespacial"
            disabled={!!piccDrawingConfig || distanceToolActive || aoiDrawingModeActive || elevationProfileActive}
          />
          <button
            type="submit"
            disabled={isSearching || !!piccDrawingConfig || distanceToolActive || aoiDrawingModeActive || elevationProfileActive}
            className="w-full sm:w-auto px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white font-semibold rounded-md shadow-md text-sm transition-colors disabled:opacity-50"
          >
            {isSearching ? 'Buscando...' : 'Buscar Lugar'}
          </button>
        </form>
        {searchError && <p className="text-sm text-red-400 mt-2 bg-red-900 p-2 rounded">{searchError}</p>}
        {searchResults && searchResults.length > 0 && (
          <div className="mt-3 space-y-2 pr-1">
            {searchResults.map((result) => (
              <div
                key={result.place_id}
                onClick={() => handleSearchResultClick(result)}
                className="p-2 bg-gray-700 hover:bg-gray-600 rounded-md cursor-pointer transition-colors"
              >
                <p className="text-sm font-medium text-cyan-200">{result.display_name}</p>
                <p className="text-xs text-gray-400">Tipo: {result.type} (Cat: {result.category})</p>
              </div>
            ))}
          </div>
        )}
        {!isSearching && !searchResults && !searchError && (
          <div className="mt-2 p-2 bg-gray-750 rounded-lg text-center text-gray-400 text-sm">
            <p>Ingrese un lugar para buscar en Colombia.</p>
          </div>
        )}
      </div>

      {(aoiDrawingModeActive || finalizedAoiGeoJson || aoiError) && (
        <div className="bg-gray-800 p-4 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold text-sky-300 mb-2">Análisis de Área de Interés (AOI)</h3>
          {aoiError && <p className="text-sm text-red-400 bg-red-900 p-2 rounded">{aoiError}</p>}

          {aoiDrawingModeActive && !finalizedAoiGeoJson && (
            <p className="text-sm text-gray-300">Haga clic en el mapa para añadir puntos al AOI. Necesita al menos 3 puntos. Luego presione "Finalizar Dibujo AOI".</p>
          )}

          {aoiStats && finalizedAoiGeoJson && (
            <div className="space-y-3 text-sm">
              <p><strong>Área del AOI:</strong> {aoiStats.areaKm2.toFixed(2)} km²</p>
              <div>
                <h4 className="font-semibold">Unidades en AOI ({aoiStats.unitsInAoi.length}):</h4>
                {aoiStats.unitsInAoi.length > 0 ? (
                  <ul className="list-disc list-inside pl-4 max-h-24 overflow-y-auto text-xs">
                    {aoiStats.unitsInAoi.map(u => (
                      <li key={u.id}
                        className="cursor-pointer hover:text-blue-300"
                        onClick={() => onSelectEntityOnMap && onSelectEntityOnMap({ type: MapEntityType.UNIT, id: u.id })}
                      >
                        {u.name} ({u.type})
                      </li>
                    ))}
                  </ul>
                ) : <p className="text-xs italic">Ninguna unidad dentro del AOI.</p>}
              </div>
              <div>
                <h4 className="font-semibold">Informes Intel en AOI ({aoiStats.intelInAoi.length}):</h4>
                {aoiStats.intelInAoi.length > 0 ? (
                  <ul className="list-disc list-inside pl-4 max-h-24 overflow-y-auto text-xs">
                    {aoiStats.intelInAoi.map(i => (
                      <li key={i.id}
                        className="cursor-pointer hover:text-yellow-300"
                        onClick={() => onSelectEntityOnMap && onSelectEntityOnMap({ type: MapEntityType.INTEL, id: i.id })}
                      >
                        {i.title}
                      </li>
                    ))}
                  </ul>
                ) : <p className="text-xs italic">Ningún informe de inteligencia dentro del AOI.</p>}
              </div>
            </div>
          )}
        </div>
      )}

      {isFetchingElevation && (
        <div className="bg-gray-800 p-4 rounded-lg shadow-md text-center">
          <p className="text-purple-300 animate-pulse">Calculando perfil de elevación...</p>
        </div>
      )}
      {elevationData && <ElevationProfileChart data={elevationData} />}


      <div className="bg-gray-800 p-4 rounded-lg shadow-md">
        <h3 className="text-lg font-semibold text-gray-200 mb-2 flex items-center">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 mr-2 text-purple-400">
            <path fillRule="evenodd" d="M15.312 5.312a.75.75 0 010 1.06L11.06 10.62l4.252 4.252a.75.75 0 11-1.06 1.06L10 11.682l-4.252 4.252a.75.75 0 01-1.06-1.06L8.939 10.62l4.688 6.372a.75.75 0 011.06-1.06L10 9.562l4.252-4.252a.75.75 0 011.06 0zM4.688 6.372a.75.75 0 011.06-1.06L10 9.562l4.252-4.252a.75.75 0 011.06 0L15.312 5.312a.75.75 0 010 1.06L11.06 10.62l4.252 4.252a.75.75 0 11-1.06 1.06L10 11.682l-4.252 4.252a.75.75 0 01-1.06-1.06L8.939 10.62 4.688 6.372z" clipRule="evenodd" />
          </svg>
          Análisis Asistido por IA (Gemini)
        </h3>
        <form onSubmit={handleSubmitAnalysis} className="space-y-3">
          <div>
            <label htmlFor="analysisQuery" className="block text-xs font-medium text-gray-300 mb-1">
              Consulta analítica:
            </label>
            <textarea
              id="analysisQuery"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              rows={3}
              className="w-full p-2 bg-gray-700 border border-gray-600 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 placeholder-gray-400 text-gray-100 text-sm"
              placeholder="Ej: '¿Cuáles son las amenazas primarias en el AO?' o 'Evaluar posibles lugares de emboscada cerca del Objetivo Alfa basados en inteligencia reciente.'"
              aria-label="Entrada de Consulta de Análisis"
              disabled={!!piccDrawingConfig || distanceToolActive || aoiDrawingModeActive || elevationProfileActive}
            />
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <input
                id="useGoogleSearch"
                type="checkbox"
                checked={useGoogleSearch}
                onChange={(e) => setUseGoogleSearch(e.target.checked)}
                className="h-4 w-4 text-blue-500 bg-gray-700 border-gray-600 rounded focus:ring-blue-600"
                aria-describedby="googleSearchDescription"
                disabled={!!piccDrawingConfig || distanceToolActive || aoiDrawingModeActive || elevationProfileActive}
              />
              <label htmlFor="useGoogleSearch" className="ml-2 text-xs text-gray-300">
                Aumentar con Google Search
              </label>
            </div>
            <button
              type="submit"
              disabled={isLoading || !!piccDrawingConfig || distanceToolActive || aoiDrawingModeActive || elevationProfileActive}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-md shadow-md text-sm transition-colors duration-150 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Enviar consulta de análisis"
            >
              {isLoading ? (
                <div className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Analizando...
                </div>
              ) : 'Analizar'}
            </button>
          </div>
          <p id="googleSearchDescription" className="text-xs text-gray-500">
            Google Search puede incrementar tiempo de respuesta e involucrar datos externos.
          </p>
        </form>

        {error && (
          <div className="mt-3 p-3 bg-red-800 border border-red-700 text-red-100 rounded-md shadow-lg text-sm" role="alert">
            <p className="font-semibold">Error de Análisis IA:</p>
            <p>{error}</p>
          </div>
        )}

        {analysisResult && (
          <div className="mt-4 p-3 bg-gray-750 rounded-lg shadow-inner space-y-3 text-sm">
            <div>
              <h4 className="text-sm font-semibold text-gray-200 mb-1">Respuesta Gemini:</h4>
              <div
                className="prose prose-xs prose-invert max-w-none whitespace-pre-wrap break-words"
                dangerouslySetInnerHTML={{ __html: analysisResult.text.replace(/\n/g, '<br />') }}
              />
            </div>
            {analysisResult.sources && analysisResult.sources.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-gray-300 mb-1">Fuentes Web Usadas:</h4>
                <ul className="list-disc list-inside space-y-0.5">
                  {analysisResult.sources.map((source, index) => (
                    <li key={index} className="text-gray-400 text-xs">
                      <a
                        href={source.uri}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-400 hover:text-blue-300 hover:underline"
                        aria-label={`Fuente: ${source.title || source.uri}`}
                      >
                        {source.title || source.uri}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
        {!isLoading && !analysisResult && !error && !searchError && !searchResults && (
          <div className="mt-3 p-3 bg-gray-750 rounded-lg shadow-inner text-center text-gray-400 text-sm">
            <p>Ingrese una consulta y haga clic en "Analizar".</p>
          </div>
        )}
      </div>
    </div>
  );
};