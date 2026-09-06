import React, { useState, useCallback, useEffect, useRef } from 'react';

import DOMPurify from 'dompurify';
import * as turf from '@turf/turf';
import { point as turfPoint, polygon as turfPolygonFunction } from '@turf/helpers';
import type { Feature as GeoJSONFeature, Polygon as GeoJSONPolygon } from 'geojson';
import type { MilitaryUnit, IntelligenceReport, GeminiAnalysisResult, SelectedEntity, NominatimResult, GeoLocation, PICCDrawConfig, PlantillaType as PlantillaTypeEnum, PICCToolDefinition, COAPlan } from '../types';
import { MapEntityType, PlantillaType } from '../types';
import { getGeminiAnalysis, generateCOAPlan, getDoctrinalAssistantResponse, simulateCOAOutcome, useAITask, updateTaskState, AoiGeoContext } from '../utils/geminiService';
import { weatherService } from '../services/weatherService';
import { decimalToDMS } from '../utils/coordinateUtils';
import { coaPlanService } from '../services/coaPlanService';

const PlantillaPICCConfig: any = {};
import { RulerIcon } from './icons/RulerIcon';
import { PencilIcon } from './icons/PencilIcon';
import { MagnifyingGlassIcon } from './icons/MagnifyingGlassIcon';
import { ExclamationTriangleIcon } from './icons/ExclamationTriangleIcon';
import { TrashIcon } from './icons/TrashIcon';
import { ChartBarIcon } from './icons/ChartBarIcon';
import { AcademicCapIcon } from './icons/AcademicCapIcon';
import { EyeIcon } from './icons/EyeIcon';
import { CheckCircleIcon } from './icons/CheckCircleIcon';
import { ShieldCheckIcon } from './icons/ShieldCheckIcon';

import { API_BASE_URL } from '../utils/apiConfig';

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
  onPiccDrawingComplete: () => void;
  piccDrawingConfig: PICCDrawConfig | null;
  setPiccDrawingConfig: (config: PICCDrawConfig | null) => void;
  onSelectEntityOnMap?: (entity: SelectedEntity | null) => void;
  activeTemplateContext: PlantillaTypeEnum | null;
  setActiveTemplateContext: (template: PlantillaTypeEnum | null) => void;
  currentUser?: { id?: string; username?: string };
  eventBus: EventEmitter;
}

interface AoiStats {
  areaKm2: number;
  unitsInAoi: MilitaryUnit[];
  intelInAoi: IntelligenceReport[];
}

// Global store to manage AI query execution and states across tab unmounting
class AnalysisStore {
  state = {
    query: '',
    useGoogleSearch: false,
    analysisResult: null as GeminiAnalysisResult | null,
    isLoading: false,
    error: null as string | null,
    
    coaObjective: '',
    coaPlan: null as COAPlan | null,
    isGeneratingCOA: false,
    coaError: null as string | null,
    
    doctrinalQuery: '',
    doctrinalResponse: null as GeminiAnalysisResult | null,
    isFetchingDoctrine: false,
    doctrinalError: null as string | null,
    
    simulationResult: null as GeminiAnalysisResult | null,
    isSimulatingCOA: false,
    simulationError: null as string | null,
  };

  listeners = new Set<() => void>();

  subscribe(listener: () => void) {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  }

  update(updates: Partial<typeof this.state>) {
    this.state = { ...this.state, ...updates };
    this.listeners.forEach(l => l());
  }
}

const analysisStore = new AnalysisStore();

const fetchMunicipalityName = async (lat: number, lon: number): Promise<string | null> => {
  try {
    // BigDataCloud is more reliable for client-side (no API key needed, no CORS/User-Agent blocks)
    const resp = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=es`);
    if (!resp.ok) return null;
    const data = await resp.json();
    const placeName = data.city || data.locality;
    const stateName = data.principalSubdivision ? `, ${data.principalSubdivision}` : '';
    return placeName ? `${placeName}${stateName}` : data.principalSubdivision || null;
  } catch (e) {
    console.error("Error reverse geocoding:", e);
    return null;
  }
};

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
  currentUser,
  eventBus,
}) => {
  const [storeState, setStoreState] = useState(() => analysisStore.state);

  useEffect(() => {
    return analysisStore.subscribe(() => {
      setStoreState(analysisStore.state);
    });
  }, []);

  const [currentGeoContext, setCurrentGeoContext] = useState<AoiGeoContext | undefined>(undefined);

  const generalAnalysisTask = useAITask('generalAnalysis');
  const coaGenerationTask = useAITask('coaGeneration');
  const coaSimulationTask = useAITask('coaSimulation');
  const doctrinalAssistantTask = useAITask('doctrinalAssistant');

  const {
    query, useGoogleSearch,
    coaObjective,
    doctrinalQuery,
  } = storeState;

  const isLoading = generalAnalysisTask.status === 'QUEUED' || generalAnalysisTask.status === 'RUNNING';
  const analysisResult = generalAnalysisTask.result;
  const error = generalAnalysisTask.error;

  const isGeneratingCOA = coaGenerationTask.status === 'QUEUED' || coaGenerationTask.status === 'RUNNING';
  const coaPlan = coaGenerationTask.result;
  const coaError = coaGenerationTask.error;

  const isSimulatingCOA = coaSimulationTask.status === 'QUEUED' || coaSimulationTask.status === 'RUNNING';
  const simulationResult = coaSimulationTask.result;
  const simulationError = coaSimulationTask.error;

  const isFetchingDoctrine = doctrinalAssistantTask.status === 'QUEUED' || doctrinalAssistantTask.status === 'RUNNING';
  const doctrinalResponse = doctrinalAssistantTask.result;
  const doctrinalError = doctrinalAssistantTask.error;

  // Local helper functions to wrap store updates as standard state setters
  const setError = (val: string | null) => updateTaskState('generalAnalysis', { error: val });
  const setQuery = (val: string) => analysisStore.update({ query: val });
  const setUseGoogleSearch = (val: boolean) => analysisStore.update({ useGoogleSearch: val });
  const setAnalysisResult = (val: GeminiAnalysisResult | null) => updateTaskState('generalAnalysis', { result: val });
  const setCoaObjective = (val: string) => analysisStore.update({ coaObjective: val });
  const setCoaPlan = (val: COAPlan | null) => updateTaskState('coaGeneration', { result: val });
  const setCoaError = (val: string | null) => updateTaskState('coaGeneration', { error: val });
  const setDoctrinalQuery = (val: string) => analysisStore.update({ doctrinalQuery: val });
  const setDoctrinalResponse = (val: GeminiAnalysisResult | null) => updateTaskState('doctrinalAssistant', { result: val });
  const setDoctrinalError = (val: string | null) => updateTaskState('doctrinalAssistant', { error: val });
  const setSimulationResult = (val: GeminiAnalysisResult | null) => updateTaskState('coaSimulation', { result: val });
  const setSimulationError = (val: string | null) => updateTaskState('coaSimulation', { error: val });
  
  const setIsLoading = (val: boolean) => updateTaskState('generalAnalysis', { status: val ? 'RUNNING' : 'IDLE' });
  const setIsGeneratingCOA = (val: boolean) => updateTaskState('coaGeneration', { status: val ? 'RUNNING' : 'IDLE' });
  const setIsFetchingDoctrine = (val: boolean) => updateTaskState('doctrinalAssistant', { status: val ? 'RUNNING' : 'IDLE' });
  const setIsSimulatingCOA = (val: boolean) => updateTaskState('coaSimulation', { status: val ? 'RUNNING' : 'IDLE' });

  const [aoiPoints, setAoiPoints] = useState<{lat: number, lng: number}[]>([]);
  const [finalizedAoiGeoJson, setFinalizedAoiGeoJson] = useState<GeoJSONFeature<GeoJSONPolygon> | null>(null);
  const [aoiStats, setAoiStats] = useState<AoiStats | null>(null);
  const [aoiSector, setAoiSector] = useState<string | null>(null);
  const [aoiError, setAoiError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchResults, setSearchResults] = useState<NominatimResult[] | null>(null);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [elevationData, setElevationData] = useState<ElevationPoint[] | null>(null);
  const [isFetchingElevation, setIsFetchingElevation] = useState<boolean>(false);
  const [loadingMessage, setLoadingMessage] = useState<string | null>(null);
  const [hasCheckedAoiOnMount, setHasCheckedAoiOnMount] = useState<boolean>(false);

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

    let geoContext: AoiGeoContext | undefined = undefined;
    let targetAoiGeoJson = finalizedAoiGeoJson;

    if (!targetAoiGeoJson && units) {
      const unitWithAoi = units.find(u => u.areaOfOperations);
      if (unitWithAoi && unitWithAoi.areaOfOperations) {
        try {
          targetAoiGeoJson = JSON.parse(unitWithAoi.areaOfOperations);
          console.log(`[AnalysisView] Usando AOI persistida de la unidad: ${unitWithAoi.name}`);
        } catch (e) {
          console.error("Error parsing fallback unit AOI:", e);
        }
      }
    }

    try {
      if (targetAoiGeoJson) {
        setLoadingMessage("Obteniendo límites y centroide del AOI...");
        const centroid = turf.centroid(targetAoiGeoJson);
        const [lon, lat] = centroid.geometry.coordinates;

        setLoadingMessage("Obteniendo relieve y clima en tiempo real del área...");
        const [elevation, weather] = await Promise.all([
          weatherService.getElevation(lat, lon).catch(() => 0),
          weatherService.getCurrentWeather(lat, lon).catch(() => undefined)
        ]);

        setLoadingMessage("Analizando topografía del AOI...");
        // Sample elevations at multiple points across the AOI for topographic context
        const allCoords = targetAoiGeoJson.geometry.coordinates[0] as [number, number][];
        // Build a grid of sample points: vertices + centroid + midpoints between vertices
        const samplePoints: { lat: number; lon: number }[] = [{ lat, lon }]; // centroid first
        allCoords.slice(0, -1).forEach((coord, idx) => {
          samplePoints.push({ lat: coord[1], lon: coord[0] }); // vertex
          const next = allCoords[(idx + 1) % (allCoords.length - 1)];
          samplePoints.push({ lat: (coord[1] + next[1]) / 2, lon: (coord[0] + next[0]) / 2 }); // midpoint
        });
        // Limit to 12 samples to avoid too many API calls — batch as one request
        const limitedSamples = samplePoints.slice(0, 12);

        let elevationMin: number | undefined;
        let elevationMax: number | undefined;
        let elevationAvg: number | undefined;
        let elevationRange: number | undefined;
        let terrainType: string | undefined;
        let elevationGrid: {lat: number, lon: number, elev: number}[] | undefined;

        try {
          const locString = limitedSamples.map(p => `${p.lat},${p.lon}`).join('|');
          const elevResp = await fetch(`https://api.open-elevation.com/api/v1/lookup?locations=${locString}`);
          if (elevResp.ok) {
            const elevData = await elevResp.json();
            const elevValues: number[] = elevData.results.map((r: any) => r.elevation as number).filter((v: number) => v !== null && !isNaN(v));
            if (elevValues.length > 0) {
              elevationMin = Math.min(...elevValues);
              elevationMax = Math.max(...elevValues);
              elevationAvg = Math.round(elevValues.reduce((a, b) => a + b, 0) / elevValues.length);
              elevationRange = elevationMax - elevationMin;
              elevationGrid = elevData.results.map((r: any) => ({ lat: r.latitude, lon: r.longitude, elev: r.elevation }));
              // Classify terrain type based on elevation and relief
              if (elevationAvg < 200) terrainType = 'Llanura / Planicie (0-200 msnm) — terreno plano, movilidad alta';
              else if (elevationAvg < 800) terrainType = 'Piedemonte / Colinas bajas (200-800 msnm) — terreno ondulado, movilidad media';
              else if (elevationAvg < 2000) terrainType = 'Montaña media (800-2000 msnm) — terreno escarpado, movilidad reducida';
              else if (elevationAvg < 3200) terrainType = 'Alta montaña (2000-3200 msnm) — terreno muy escarpado, movilidad muy reducida';
              else terrainType = 'Páramo / Altiplano (>3200 msnm) — condiciones extremas, movilidad crítica';
              if (elevationRange > 500) terrainType += `, relieve pronunciado (${elevationRange.toFixed(0)} m desnivel)`;
              else if (elevationRange > 200) terrainType += `, relieve moderado (${elevationRange.toFixed(0)} m desnivel)`;
              else terrainType += `, relieve suave (${elevationRange.toFixed(0)} m desnivel)`;
            }
          }
        } catch (_e) {
          console.warn('[AnalysisView] No se pudo obtener topografía detallada del AOI, usando solo centroide.');
        }

        setLoadingMessage("Determinando cobertura geográfica del AOI...");
        const coordinates = targetAoiGeoJson.geometry.coordinates[0];
        const uniqueCoords: [number, number][] = [];
        coordinates.forEach((coord: number[]) => {
          if (uniqueCoords.length < 4 && !uniqueCoords.some(c => c[0] === coord[0] && c[1] === coord[1])) {
            uniqueCoords.push(coord as [number, number]);
          }
        });

        const pointsToGeocode = [{ lat, lon }, ...uniqueCoords.map(c => ({ lat: c[1], lon: c[0] }))];
        const geoResults = await Promise.all(pointsToGeocode.map(p => fetchMunicipalityName(p.lat, p.lon)));
        const municipalities = Array.from(new Set(geoResults.filter(Boolean) as string[]));

        geoContext = {
          areaKm2: turf.area(targetAoiGeoJson) / 1000000,
          centroid: {
            lat,
            lon,
            dms: `${decimalToDMS({ lat, lon })}`
          },
          municipalities,
          elevationMeters: elevation,
          weather,
          elevationMin,
          elevationMax,
          elevationAvg,
          elevationRange,
          terrainType,
          elevationGrid
        };

        setCurrentGeoContext(geoContext);

      }

      setLoadingMessage("Encolando tarea en el servidor de IA...");
      const result = await getGeminiAnalysis(query, units, intelligenceReports, useGoogleSearch, enemyInfluenceLayerActive, geoContext);
      setAnalysisResult(result);
    } catch (err: any) {
      setError(err.message || "Ocurrió un error inesperado durante el análisis.");
    } finally {
      setIsLoading(false);
      setLoadingMessage(null);
    }
  }, [query, units, intelligenceReports, useGoogleSearch, enemyInfluenceLayerActive, finalizedAoiGeoJson, deactivateOtherTools]);

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
          createdByUserId: currentUser?.id || currentUser?.username || 'unknown',
          createdTimestamp: new Date().toISOString()
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
      setAoiDrawingModeActive(false);
    } else {
      setAoiDrawingModeActive(true);
      setFinalizedAoiGeoJson(null);
      setAoiStats(null);
      setAoiError(null);
      eventBus.publish('clearAoiLayer');
    }
  };

  const handleFinalizeAoi = () => {
    if (!finalizedAoiGeoJson) return;
    
    setAoiDrawingModeActive(false);
    const polygonGeoJson = finalizedAoiGeoJson;

    const areaM2 = turf.area(polygonGeoJson);
    const unitsInAoi = units.filter(unit => turf.booleanPointInPolygon(turfPoint([unit.location.lon, unit.location.lat]), polygonGeoJson));
    const intelInAoi = intelligenceReports.filter(intel => turf.booleanPointInPolygon(turfPoint([intel.location.lon, intel.location.lat]), polygonGeoJson));

    setAoiStats({ areaKm2: areaM2 / 1000000, unitsInAoi, intelInAoi });
    setAoiError(null);
    // Ahora sí, asignar formalmente al mapa
    eventBus.publish('finalizeAoiLayer', polygonGeoJson);
  };

  const handleClearAoi = () => {
    setAoiDrawingModeActive(false);
    setAoiPoints([]);
    setFinalizedAoiGeoJson(null);
    setAoiStats(null);
    setAoiError(null);
    setAoiSector(null);
    eventBus.publish('clearAoiLayer');
  };

  const unitsRef = useRef(units);
  const intelRef = useRef(intelligenceReports);

  useEffect(() => {
    unitsRef.current = units;
    intelRef.current = intelligenceReports;
  }, [units, intelligenceReports]);

  useEffect(() => {
    const onDeactivateAoiMode = () => {
      setAoiDrawingModeActive(false);
    };

    const handleFinished = (_msg: string, geoJson: any) => {
      setFinalizedAoiGeoJson(geoJson);
    };

    const handleApproveGeneralAoi = (_msg: string, geoJson: any) => {
      setAoiDrawingModeActive(false);
      setFinalizedAoiGeoJson(geoJson);
      
      const areaM2 = turf.area(geoJson);
      const unitsInAoi = unitsRef.current.filter(unit => turf.booleanPointInPolygon(turfPoint([unit.location.lon, unit.location.lat]), geoJson));
      const intelInAoi = intelRef.current.filter(intel => turf.booleanPointInPolygon(turfPoint([intel.location.lon, intel.location.lat]), geoJson));

      setAoiStats({ areaKm2: areaM2 / 1000000, unitsInAoi, intelInAoi });
      setAoiError(null);
    };

    const deactivateToken = eventBus.subscribe('deactivateAoiDrawingMode', onDeactivateAoiMode);
    const finishedToken = eventBus.subscribe('aoiDrawingFinished', handleFinished);
    const approveToken = eventBus.subscribe('approveGeneralAoi', handleApproveGeneralAoi);
    
    return () => {
      eventBus.unsubscribe(deactivateToken);
      eventBus.unsubscribe(finishedToken);
      eventBus.unsubscribe(approveToken);
    };
  }, [eventBus, setAoiDrawingModeActive]);

  // Sincronizar AOI de la unidad guardada al montar el componente para evitar que se pierda al cambiar de pestaña
  useEffect(() => {
    if (!hasCheckedAoiOnMount) {
      setHasCheckedAoiOnMount(true);
      if (!finalizedAoiGeoJson && units && units.length > 0) {
        const unitWithAoi = units.find(u => u.areaOfOperations);
        if (unitWithAoi && unitWithAoi.areaOfOperations) {
          try {
            const geoJson = JSON.parse(unitWithAoi.areaOfOperations);
            setFinalizedAoiGeoJson(geoJson);

            const areaM2 = turf.area(geoJson);
            const unitsInAoi = units.filter(unit => turf.booleanPointInPolygon(turfPoint([unit.location.lon, unit.location.lat]), geoJson));
            const intelInAoi = intelligenceReports.filter(intel => turf.booleanPointInPolygon(turfPoint([intel.location.lon, intel.location.lat]), geoJson));
            
            setAoiStats({ areaKm2: areaM2 / 1000000, unitsInAoi, intelInAoi });
            setAoiError(null);

            // Obtener el sector correspondiente
            if (geoJson.geometry?.coordinates?.[0]?.length > 0) {
              const center = geoJson.geometry.coordinates[0][0];
              fetch(`${API_BASE_URL}/api/weather/geocode?lat=${center[1]}&lon=${center[0]}`)
                .then(r => r.json())
                .then(data => {
                  if (data.sector) setAoiSector(data.sector);
                })
                .catch(e => console.warn("Failed geocoding sector in mount hook", e));
            }
          } catch (e) {
            console.error("Error restoring AOI from units on mount:", e);
          }
        }
      }
    }
  }, [units, intelligenceReports, finalizedAoiGeoJson, hasCheckedAoiOnMount]);

  // Elevation Profile Logic (Existing + Fixed)
  const handleElevationProfileLine = async (_msg: string, { latlngs }: { latlngs: {lat: number, lng: number}[] }) => {
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
  const handleLosLine = async (_msg: string, { latlngs }: { latlngs: {lat: number, lng: number}[] }) => {
    if (!lineOfSightActive || latlngs.length < 2) return;

    const start = latlngs[0];
    const end = latlngs[latlngs.length - 1];

    setIsFetchingElevation(true);
    setLineOfSightActive(false);
    setElevationProfileActive(false);
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
  const handleSlopeLine = async (_msg: string, { latlngs }: { latlngs: {lat: number, lng: number}[] }) => {
    if (!slopeAnalysisActive || latlngs.length < 2) return;

    setIsFetchingElevation(true);
    setSlopeAnalysisActive(false);
    setElevationProfileActive(false);
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
              {doctrinalAssistantTask.status === 'QUEUED' ? `Cola: puesto #${doctrinalAssistantTask.queuePosition}...` :
               doctrinalAssistantTask.status === 'RUNNING' ? 'Consultando...' : 'Consultar Doctrina'}
            </button>
          </div>
        </form>
        {doctrinalError && <p className="mt-2 text-sm text-red-400 bg-red-900 p-2 rounded">{doctrinalError}</p>}
        {doctrinalResponse && (
          <div className="mt-4 p-3 bg-gray-750 rounded-lg shadow-inner text-sm">
            <div className="prose prose-invert prose-sm max-w-none text-gray-300">
              <div 
                dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize((doctrinalResponse.text || "").replace(/\n/g, '<br />')) }} 
              />
            </div>
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
              {coaGenerationTask.status === 'QUEUED' ? `Cola: puesto #${coaGenerationTask.queuePosition}...` :
               coaGenerationTask.status === 'RUNNING' ? 'Generando Plan...' : 'Generar Plan de Maniobra'}
            </button>
          </div>
        </form>
        {coaError && <p className="mt-2 text-sm text-red-400 bg-red-900 p-2 rounded">{coaError}</p>}
        {coaPlan && (
          <div className="mt-4 p-4 bg-gray-750 rounded-lg shadow-inner space-y-4 text-sm border border-lime-500/20">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-gray-700 pb-2">
              <h4 className="font-bold text-base text-lime-300">{coaPlan.planName}</h4>
              <span className="px-2 py-0.5 bg-lime-950 text-lime-400 border border-lime-700/50 rounded text-[10px] font-black uppercase tracking-wider">
                🗺️ Calco Táctico Graficado en Mapa 3D
              </span>
            </div>

            {coaPlan.conceptOfOperations && (
              <div>
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1">Intención del Comandante / Concepto:</p>
                <p className="text-gray-200 text-xs whitespace-pre-wrap bg-gray-800/60 p-2.5 rounded border border-gray-700/50">
                  {coaPlan.conceptOfOperations}
                </p>
              </div>
            )}

            {coaPlan.unidades_asignadas && coaPlan.unidades_asignadas.length > 0 && (
              <div>
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Unidades y Tareas Tácticas Asignadas:</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {coaPlan.unidades_asignadas.map((u, i) => (
                    <div key={i} className="p-2 bg-gray-800 rounded border border-gray-700/60 flex flex-col gap-0.5">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-xs text-cyan-300">{u.indicativo}</span>
                        <span className="text-[10px] px-1.5 py-0.2 bg-blue-900/60 text-blue-300 rounded font-semibold">{u.rol_tactico}</span>
                      </div>
                      <span className="text-[11px] text-gray-300">Misión: {u.mision}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-3 pt-2 border-t border-gray-700">
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Fases de la Maniobra y Calco de Control:</p>
              {coaPlan.phases?.map((phase, index) => (
                <div key={index} className="p-3 bg-gray-800/80 rounded border border-gray-700/50 space-y-1.5">
                  <div className="flex justify-between items-center">
                    <p className="font-bold text-xs text-lime-200">{phase.phaseName}</p>
                    {phase.graphics && phase.graphics.length > 0 && (
                      <span className="text-[10px] px-2 py-0.5 bg-blue-950 text-blue-400 border border-blue-800/60 rounded-full font-mono">
                        📍 {phase.graphics.length} medidas de control
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-300 whitespace-pre-wrap">{phase.description}</p>
                </div>
              ))}
            </div>

            {coaPlan.sincronizacion_fuegos_y_uav && (
              <div className="pt-2 border-t border-gray-700 space-y-1">
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Sincronización de Fuegos y Medios UAS:</p>
                <div className="p-2.5 bg-gray-800 rounded text-xs space-y-1 border border-gray-700/50">
                  {coaPlan.sincronizacion_fuegos_y_uav.reconocimiento_aereo && (
                    <p className="text-gray-300"><span className="text-cyan-400 font-bold">UAS / Reconocimiento:</span> {coaPlan.sincronizacion_fuegos_y_uav.reconocimiento_aereo}</p>
                  )}
                  {coaPlan.sincronizacion_fuegos_y_uav.apoyo_fuego && (
                    <p className="text-gray-300"><span className="text-orange-400 font-bold">Apoyo de Fuegos:</span> {coaPlan.sincronizacion_fuegos_y_uav.apoyo_fuego}</p>
                  )}
                </div>
              </div>
            )}

            {coaPlan.riesgo_y_mitigacion && coaPlan.riesgo_y_mitigacion.length > 0 && (
              <div className="pt-2 border-t border-gray-700 space-y-1">
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Gestión de Riesgos y Mitigación:</p>
                <div className="space-y-1.5">
                  {coaPlan.riesgo_y_mitigacion.map((r, i) => (
                    <div key={i} className="p-2 bg-red-950/20 border border-red-900/40 rounded text-xs flex flex-col gap-0.5">
                      <span className="text-red-300 font-bold">⚠️ {r.riesgo}</span>
                      <span className="text-gray-300">🛡️ Mitigación: {r.mitigacion}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="pt-3 border-t border-gray-600 flex flex-col space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-400 italic">Plan generado con IA. ¿Desea simular el resultado probable?</span>
                <button
                  onClick={handleSimulateCOA}
                  disabled={isSimulatingCOA}
                  className="px-3 py-1.5 bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold rounded shadow transition-colors disabled:opacity-50"
                >
                  {coaSimulationTask.status === 'QUEUED' ? `Cola: puesto #${coaSimulationTask.queuePosition}...` :
                   coaSimulationTask.status === 'RUNNING' ? 'Simulando...' : 'Ejecutar Wargaming / Simulación'}
                </button>
              </div>

              {simulationError && <p className="text-xs text-red-400 bg-red-900/50 p-2 rounded">{simulationError}</p>}

              {simulationResult && (
                <div className="p-3 bg-orange-900/20 border border-orange-800 rounded-md">
                  <h5 className="font-bold text-orange-300 mb-2 flex items-center">
                    <ExclamationTriangleIcon className="w-4 h-4 mr-2" />
                    Resultado Estimado de la Simulación
                  </h5>
                  <div className="prose prose-invert prose-sm max-w-none text-gray-300 mt-2">
                    <div 
                      dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize((simulationResult.text || "").replace(/\n/g, '<br />')) }} 
                    />
                  </div>
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
          {finalizedAoiGeoJson && !aoiStats && (
            <button
              onClick={handleFinalizeAoi}
              className="px-3 py-1.5 text-xs font-bold rounded-md shadow-sm flex items-center transition-all bg-green-500 hover:bg-green-600 text-white animate-pulse"
            >
              <CheckCircleIcon className="w-4 h-4 mr-1.5" />
              APROBAR Y ANALIZAR AO
            </button>
          )}

          {(aoiDrawingModeActive || finalizedAoiGeoJson) && (
            <button
              onClick={handleClearAoi}
              className="px-3 py-1.5 text-xs font-medium rounded-md shadow-sm flex items-center transition-colors bg-red-600 hover:bg-red-700 text-white"
            >
              <TrashIcon className="w-4 h-4 mr-1.5" />
              {finalizedAoiGeoJson ? 'Borrar AO' : 'Cancelar Dibujo'}
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
        <div className="bg-gray-800 p-4 rounded-lg shadow-md border-t-2 border-sky-500/30 animate-in fade-in duration-500">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-lg font-semibold text-sky-300 flex items-center">
              <span className="mr-2">📐</span> Área de Operaciones {aoiStats ? <span className="ml-2 px-1.5 py-0.5 bg-sky-950 text-sky-400 text-[9px] font-black rounded border border-sky-800/50 uppercase">Asignada</span> : ''}
            </h3>
            {finalizedAoiGeoJson && (
              <button 
                onClick={handleClearAoi}
                className="text-gray-400 hover:text-red-400 text-xs flex items-center gap-1 transition-colors"
                title="Limpiar Área"
              >
                <TrashIcon className="w-4 h-4" /> <span>Descartar</span>
              </button>
            )}
          </div>

          {(aoiSector || finalizedAoiGeoJson) && (
            <div className="mb-4 p-2 bg-sky-900/10 border border-sky-800/20 rounded flex items-center gap-2">
              <div className="w-1.5 h-1.5 bg-sky-500 rounded-full animate-pulse"></div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                Sector: <span className="text-sky-300">{aoiSector || "Identificando..."}</span>
              </p>
            </div>
          )}
          {aoiError && <p className="text-sm text-red-400 bg-red-900/30 p-2 rounded mb-3 border border-red-800/50">{aoiError}</p>}

          {aoiStats && finalizedAoiGeoJson && (
            <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-500">
              <div className="grid grid-cols-3 gap-2 py-2 border-y border-gray-700">
                <div className="text-center">
                  <p className="text-[10px] text-gray-500 uppercase font-black">Superficie</p>
                  <p className="text-lg font-mono text-sky-400">{aoiStats.areaKm2.toFixed(2)}<span className="text-xs ml-0.5">KM²</span></p>
                </div>
                <div className="text-center border-x border-gray-700">
                  <p className="text-[10px] text-gray-500 uppercase font-black">Unidades</p>
                  <p className="text-lg font-mono text-green-400">{aoiStats.unitsInAoi.length}</p>
                </div>
                <div className="text-center">
                  <p className="text-[10px] text-gray-500 uppercase font-black">Intel</p>
                  <p className="text-lg font-mono text-yellow-500">{aoiStats.intelInAoi.length}</p>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Unidades Identificadas</h4>
                {aoiStats.unitsInAoi.length > 0 ? (
                  <div className="max-h-32 overflow-y-auto custom-scrollbar space-y-1 pr-1">
                    {aoiStats.unitsInAoi.map(u => (
                      <div key={u.id}
                        className="p-1 px-2 flex justify-between items-center bg-gray-750 hover:bg-gray-700 rounded border border-gray-700/50 cursor-pointer text-xs"
                        onClick={() => onSelectEntityOnMap && onSelectEntityOnMap({ type: MapEntityType.UNIT, id: u.id })}
                      >
                        <span className="text-gray-200 font-medium truncate">{u.name}</span>
                        <span className="text-[10px] text-gray-500 italic">{u.type}</span>
                      </div>
                    ))}
                  </div>
                ) : <p className="text-xs italic text-gray-500">Sin unidades en el sector.</p>}
              </div>

              <div>
                <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Puntos de Inteligencia</h4>
                {aoiStats.intelInAoi.length > 0 ? (
                  <div className="max-h-32 overflow-y-auto custom-scrollbar space-y-1 pr-1">
                    {aoiStats.intelInAoi.map(i => (
                      <div key={i.id}
                        className="p-1 px-2 flex justify-between bg-gray-750 hover:bg-gray-700 rounded border border-gray-700/50 cursor-pointer text-xs"
                        onClick={() => onSelectEntityOnMap && onSelectEntityOnMap({ type: MapEntityType.INTEL, id: i.id })}
                      >
                        <span className="text-yellow-500/80 font-medium truncate">{i.title}</span>
                      </div>
                    ))}
                  </div>
                ) : <p className="text-xs italic text-gray-500">Sin alertas de inteligencia en el sector.</p>}
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
          Análisis Asistido por IA
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
              {generalAnalysisTask.status === 'QUEUED' ? (
                <div className="flex items-center text-amber-400">
                  Cola: puesto #{generalAnalysisTask.queuePosition}...
                </div>
              ) : generalAnalysisTask.status === 'RUNNING' ? (
                <div className="flex items-center text-blue-300">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-blue-300" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
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

        {isLoading && (
          <div className="mt-4 p-4 bg-gray-750 rounded-lg shadow-inner flex flex-col items-center justify-center space-y-2 text-sm text-gray-300">
            <svg className="animate-spin h-8 w-8 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <p className="font-semibold text-blue-400">{loadingMessage || 'Procesando consulta...'}</p>
            {generalAnalysisTask.status === 'QUEUED' && (
              <p className="text-xs text-amber-500 font-bold">Posición en la cola: #{generalAnalysisTask.queuePosition}</p>
            )}
          </div>
        )}

        {error && (
          <div className="mt-3 p-3 bg-red-800 border border-red-700 text-red-100 rounded-md shadow-lg text-sm" role="alert">
            <p className="font-semibold">Error de Análisis IA:</p>
            <p>{error}</p>
          </div>
        )}

        {analysisResult && (
          <div className="mt-4 p-3 bg-gray-750 rounded-lg shadow-inner space-y-3 text-sm">
            <div>
              <h4 className="text-sm font-semibold text-gray-200 mb-1">Respuesta de la IA:</h4>
              <div className="prose prose-invert max-w-none prose-sm text-gray-300">
                <div 
                  dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(analysisResult.text.replace(/\n/g, '<br />')) }} 
                />
              </div>
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