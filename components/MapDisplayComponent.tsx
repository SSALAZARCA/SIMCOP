import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet-draw';
import 'leaflet-polylinedecorator';
import 'leaflet.markercluster';
import * as turf from '@turf/turf';
import type { Feature as GeoJSONFeature, Polygon as GeoJSONPolygon, Position } from 'geojson';
import { point as turfPoint } from '@turf/helpers';
import ms from 'milsymbol';
import type { PathOptions } from 'leaflet';

import { MapEntityType, UnitType, ViewType, UserRole, PlantillaType, IntelligenceReliability, IntelligenceCredibility, AssessedThreatLevel, UnitStatus } from '../types';
import type { MilitaryUnit, MapDisplayProps, SelectedEntity, GeoLocation, PICCDrawingConfig, PICCElement, PICCDrawingOptions, PICCDrawingToolType, IntelligenceReport, ArtilleryPiece, ForwardObserver, FireMission, AfterActionReport, LeafletDrawEvent, SIDCGenerationOptions, Hotspot, COAPlan, WeatherInfo } from '../types';
import {
  MAP_BOUNDS, MAP_CENTER, MAP_ZOOM_DEFAULT, MAP_ZOOM_MIN, MAP_ZOOM_MAX,
  UNIT_ICONS, UNIT_COLORS, PICC_COLORS, PICC_PATH_OPTIONS_NEUTRAL, PICC_PATH_OPTIONS_FRIENDLY, PICC_PATH_OPTIONS_HOSTILE,
  PICC_PATH_OPTIONS_UNKNOWN, PICC_MARKER_OPTIONS, UNIT_TYPE_TO_FUNCTION_ID_APP6_DEFAULT, CAPABILITY_TO_FUNCTION_ID_APP6,
  SIDC_AFFILIATION_FRIEND, SIDC_AFFILIATION_HOSTILE, SIDC_AFFILIATION_NEUTRAL, SIDC_AFFILIATION_UNKNOWN,
  SIDC_DIMENSION_GROUND, SIDC_STATUS_PRESENT, PICC_SIDC, CORRECTED_ECHELON_MAPPING, SIDC_FORWARD_OBSERVER,
  ARTILLERY_TYPE_DETAILS, DEFAULT_PICC_SYMBOL_SIZE, PICC_PATH_OPTIONS_CONTROL, SIDC_DIMENSION_SOF, SIDC_DIMENSION_AIR
} from '../constants';
import { piccService } from '../services/piccService';
import { OperationalGraphic } from '../types';
import { decimalToDMS } from '../utils/coordinateUtils';
import { PlantillaPICCConfig } from '../utils/piccConfig';
import { PICCElementType } from '../types';
import { assessThreatLevel, getThreatStyle, generateUnitSIDC, getPICCElementSIDC, INITIAL_ENEMY_FILTER_KEYWORDS } from '../utils/sidcUtils';
import { operationalGraphicToLayer, layerToOperationalGraphic } from '../utils/piccPersistence';
import { addCenterSymbolToArea, applyFillPattern, enhanceAttackAxis } from '../utils/piccSymbology';
import { coaPlanToLayers, getCOAPlanBounds } from '../utils/coaVisualization';
import { useUnitLayer } from '../hooks/useUnitLayer';
import { ArrowsPointingOutIcon, ArrowsPointingInIcon, AdjustmentsHorizontalIcon, BoltIcon, CloudIcon } from './icons';
import { weatherService } from '../services/weatherService';
import { API_BASE_URL } from '../utils/apiConfig';
import { Map3DDisplayComponent } from './Map3DDisplayComponent';

interface EventEmitter {
  subscribe(event: string, callback: (...args: any[]) => void): string;
  unsubscribe(token: string): void;
  publish(event: string, data?: any): void;
}


// SIDC Generation Logic moved to utils/sidcUtils.ts


export const MapDisplayComponent: React.FC<MapDisplayProps> = ({
  units,
  intelligenceReports,
  artilleryPieces,
  forwardObservers,
  activeFireMissions,
  afterActionReports = [],
  selectedEntity,
  onSelectEntityOnMap,
  distanceToolActive = false,
  aoiDrawingModeActive = false,
  enemyInfluenceLayerActive = false,
  elevationProfileActive = false,
  piccDrawingConfig,
  onPiccDrawingComplete,
  activeTemplateContext,
  isTargetSelectionActive = false,
  onTargetSelected,
  eventBus,
  entityToPanTo,
  hotspots = [],
  historicalHotspots = [],
  osintEvents = [],
  osintLayerActive = false,
  isMaximized = false,
  onToggleMaximize,
  aoDrawingUnitId,
  onAoFinishDrawing,
  isCoordinatePickingActive = false,
  onCoordinatePicked
}) => {
  const mapRef = useRef<L.Map | null>(null);
  const unitLayerRef = useRef<L.MarkerClusterGroup | null>(null);
  const intelLayerRef = useRef<L.FeatureGroup>(L.featureGroup());
  const aarLayerRef = useRef<L.FeatureGroup>(L.featureGroup());
  const routeLayerRef = useRef<L.FeatureGroup>(L.featureGroup());
  const selectionHighlightLayerRef = useRef<L.FeatureGroup>(L.featureGroup());
  const distanceToolLayerRef = useRef<L.FeatureGroup>(L.featureGroup());
  const aoiLayerRef = useRef<L.FeatureGroup>(L.featureGroup());
  const elevationProfileLayerRef = useRef<L.FeatureGroup>(L.featureGroup());
  const searchResultMarkerLayerRef = useRef<L.FeatureGroup>(L.featureGroup());
  const enemyInfluencePolygonsRef = useRef<L.FeatureGroup>(L.featureGroup());
  const artilleryLayerRef = useRef<L.FeatureGroup>(L.featureGroup());
  const artilleryRangeLayerRef = useRef<L.FeatureGroup>(L.featureGroup());
  const observerLayerRef = useRef<L.FeatureGroup>(L.featureGroup());
  const fireMissionLayerRef = useRef<L.FeatureGroup>(L.featureGroup());
  const hotspotsLayerRef = useRef<L.FeatureGroup>(L.featureGroup());
  const historicalHotspotsLayerRef = useRef<L.FeatureGroup>(L.featureGroup());
  const linkGraphLayerRef = useRef<L.FeatureGroup>(L.featureGroup());
  const osintLayerRef = useRef<L.FeatureGroup>(L.featureGroup());
  const uavLayerRef = useRef<L.FeatureGroup>(L.featureGroup());
  const coaLayerRef = useRef<L.LayerGroup[]>([]);
  const [currentCOAPlan, setCurrentCOAPlan] = useState<COAPlan | null>(null);
  const [is3DActive, setIs3DActive] = useState<boolean>(false);

  const piccTemplateLayersRef = useRef<Record<PlantillaType, L.FeatureGroup>>({} as Record<PlantillaType, L.FeatureGroup>);
  const [isThunderstorm, setIsThunderstorm] = useState(false);
  const [showWindyTacticalPanel, setShowWindyTacticalPanel] = useState<boolean>(false);
  const [windyCoords, setWindyCoords] = useState<{lat: number, lon: number, zoom: number}>({ lat: 4.5708, lon: -74.2973, zoom: 6 });
  const layerControlRef = useRef<L.Control.Layers | null>(null);
  const weatherLayerRef = useRef<L.TileLayer | null>(null);
  const weatherAlertLayerRef = useRef<L.LayerGroup>(L.layerGroup());
  const [weatherInfo, setWeatherInfo] = useState<WeatherInfo | null>(null);
  const weatherMarkersLayerRef = useRef<L.LayerGroup | null>(null);

  const activeDrawControlRef = useRef<any | null>(null);
  const currentPICCDrawingToolRef = useRef<any | null>(null);
  // Dedicated refs for AOI polygon drawing — survive useEffect re-runs
  const aoiPolygonToolRef = useRef<any | null>(null);          // the actual active L.Draw.Polygon instance
  const aoiVertexCountRef = useRef<number>(0);                 // count of vertices placed so far
  const aoiDrawingModeActiveRef = useRef<boolean>(false);      // mirror of aoiDrawingModeActive prop for closures
  const lastPannedIdRef = useRef<string | null>(null);




  // Top-level refs for callbacks to avoid re-triggering effects or violating Hook rules
  const onAoFinishDrawingRef = useRef(onAoFinishDrawing);
  const onPiccDrawingCompleteRef = useRef(onPiccDrawingComplete);

  useEffect(() => {
    onAoFinishDrawingRef.current = onAoFinishDrawing;
  }, [onAoFinishDrawing]);

  useEffect(() => {
    onPiccDrawingCompleteRef.current = onPiccDrawingComplete;
  }, [onPiccDrawingComplete]);

  const [distancePoints, setDistancePoints] = useState<L.LatLng[]>([]);
  const [elevationDisplay, setElevationDisplay] = useState<string>("Elevación: --- m");
  const fetchElevationTimeoutRef = useRef<number | null>(null);

  const [showFilters, setShowFilters] = useState<boolean>(false);
  const [timeOffsetHours, setTimeOffsetHours] = useState<number>(0); // 0h to 72h
  const [showOsintLayer, setShowOsintLayer] = useState<boolean>(osintLayerActive);
  const [showHotspotsLayer, setShowHotspotsLayer] = useState<boolean>(true);
  const [showHistoricalHotspotsLayer, setShowHistoricalHotspotsLayer] = useState<boolean>(false);
  const [showUavLayer, setShowUavLayer] = useState<boolean>(true);
  const [unitStatusFilter, setUnitStatusFilter] = useState<UnitStatus | 'ALL'>('ALL');
  const [unitTypeFilter, setUnitTypeFilter] = useState<UnitType | 'ALL'>('ALL');
  const [intelReliabilityFilter, setIntelReliabilityFilter] = useState<IntelligenceReliability | 'ALL'>('ALL');

  // Sync prop visibility with local state
  useEffect(() => {
    setShowOsintLayer(osintLayerActive);
  }, [osintLayerActive]);

  const filteredUnits = useMemo(() => {
    return units.filter(unit => {
      const statusMatch = unitStatusFilter === 'ALL' || unit.status === unitStatusFilter;
      const typeMatch = unitTypeFilter === 'ALL' || unit.type === unitTypeFilter;
      return statusMatch && typeMatch;
    });
  }, [units, unitStatusFilter, unitTypeFilter]);

  const filteredIntel = useMemo(() => {
    return intelligenceReports.filter(report => {
      const reliabilityMatch = intelReliabilityFilter === 'ALL' || report.reliability === intelReliabilityFilter;
      const timeLimitAdjusted = Date.now() - (timeOffsetHours * 60 * 60 * 1000);
      const timeMatch = timeOffsetHours === 0 || report.eventTimestamp >= timeLimitAdjusted;
      return reliabilityMatch && timeMatch;
    });
  }, [intelligenceReports, intelReliabilityFilter, timeOffsetHours]);


  useEffect(() => {
    if (typeof L === 'undefined' || !L || typeof L.map !== 'function') {
      console.error("Leaflet library (L) is not loaded or L.map is not available. Map initialization aborted.");
      const mapContainerElement = document.getElementById('map-container');
      if (mapContainerElement) {
        mapContainerElement.innerHTML = '<div style="color: white; text-align: center; padding: 50px; font-size: 1.2em;">Error: No se pudo cargar la biblioteca de mapas (Leaflet). Verifique la conexión a internet y la consola para más detalles.</div>';
      }
      return;
    }

    if (!mapRef.current) {
      const mapContainerElement = document.getElementById('map-container');
      if (!mapContainerElement) {
        console.error("Map container element 'map-container' not found.");
        return;
      }

      const mapInstance = L.map('map-container');
      mapRef.current = mapInstance;

      if (!mapInstance.getPane('weatherPane')) {
        mapInstance.createPane('weatherPane');
        const weatherPane = mapInstance.getPane('weatherPane');
        if (weatherPane) {
          weatherPane.style.zIndex = '401'; // Above base map and overlays, below popups
        } else {
          console.error("WeatherLayer: Failed to create 'weatherPane'.");
        }
      }

      const osmLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      });
      const satelliteLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
      });
      const openTopoMap = L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
        attribution: 'Map data: &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, <a href="http://viewfinderpanoramas.org">SRTM</a> | Map style: &copy; <a href="https://opentopomap.org">OpenTopoMap</a> (<a href="https://creativecommons.org/licenses/by-sa/3.0/">CC-BY-SA</a>)'
      });
      const transportMap = L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
      });
      const cartoLabelsLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://carto.com/attributions">CARTO</a>',
        pane: 'overlayPane'
      });

      // Capa de Etiquetas e información de nombres de lugares específica para el mapa satelital híbrido
      const satelliteLabelsLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://carto.com/attributions">CARTO</a>',
        pane: 'overlayPane'
      });

      // Capa de límites y nombres oficiales de departamentos y municipios (IGAC WMS)
      const igacBoundariesLayer = L.tileLayer.wms('https://mapas.igac.gov.co/server/services/catastro/direccionesterritorialesigac/MapServer/WMSServer', {
        layers: '1,2',
        format: 'image/png',
        transparent: true,
        attribution: '© IGAC',
        pane: 'overlayPane'
      });

      // Grupo satelital híbrido con nombres y límites político-administrativos
      const satelliteGroup = L.layerGroup([
        satelliteLayer,
        satelliteLabelsLayer,
        igacBoundariesLayer
      ]);

      osmLayer.addTo(mapInstance);

      const baseMaps = {
        "Mapa Estándar": osmLayer,
        "Imagen Satelital": satelliteGroup,
        "Topográfico": openTopoMap,
        "Transporte": transportMap,
      };
      const overlayMaps: Record<string, L.Layer> = {
        "Etiquetas de Lugares": cartoLabelsLayer,
        "Análisis de Hotspots (BMA)": hotspotsLayerRef.current,
        "Histórico Hotspots (48h)": historicalHotspotsLayerRef.current,
        "OSINT: Noticias Seg. (IA)": osintLayerRef.current,
        "Activos UAV (Tiempo Real)": uavLayerRef.current,
      };

      for (const plantillaKey of (Object.values(PlantillaType) as string[])) {
        const fg = L.featureGroup();
        piccTemplateLayersRef.current[plantillaKey] = fg;
        fg.addTo(mapInstance);
        const plantillaConfig = PlantillaPICCConfig[plantillaKey];
        overlayMaps[`PICC: ${plantillaConfig?.label || plantillaKey}`] = fg;
      }

      if (layerControlRef.current) {
        mapInstance.removeControl(layerControlRef.current);
      }
      layerControlRef.current = L.control.layers(baseMaps, overlayMaps, {
        collapsed: true,
        position: 'topleft'
      });
      layerControlRef.current.addTo(mapInstance);

      // Capas meteorológicas antiguas de RainViewer y Open-Meteo removidas para unificar con Windy

      unitLayerRef.current = (L as any).markerClusterGroup();
      mapInstance.addLayer(unitLayerRef.current);

      intelLayerRef.current.addTo(mapInstance);
      aarLayerRef.current.addTo(mapInstance);
      routeLayerRef.current.addTo(mapInstance);
      artilleryLayerRef.current.addTo(mapInstance);
      artilleryRangeLayerRef.current.addTo(mapInstance);
      observerLayerRef.current.addTo(mapInstance);
      fireMissionLayerRef.current.addTo(mapInstance);
      selectionHighlightLayerRef.current.addTo(mapInstance);
      distanceToolLayerRef.current.addTo(mapInstance);
      aoiLayerRef.current.addTo(mapInstance);
      elevationProfileLayerRef.current.addTo(mapInstance);
      searchResultMarkerLayerRef.current.addTo(mapInstance);
      linkGraphLayerRef.current.addTo(mapInstance);
      weatherAlertLayerRef.current.addTo(mapInstance);

      enemyInfluencePolygonsRef.current.addTo(mapInstance);

      const colombiaBounds = L.latLngBounds(
        [MAP_BOUNDS.MIN_LAT, MAP_BOUNDS.MIN_LON],
        [MAP_BOUNDS.MAX_LAT, MAP_BOUNDS.MAX_LON]
      );
      mapInstance.fitBounds(colombiaBounds);

      const fetchWeatherForCenter = async () => {
        const center = mapInstance.getCenter();
        try {
          const info = await weatherService.getCurrentWeather(center.lat, center.lng);
          if (info) {
            setWeatherInfo(info);
            setIsThunderstorm(info.isThunderstorm || false);
          }
        } catch (e) {
          console.warn("Failed to update weather for center:", e);
        }
      };

      mapInstance.on('moveend', fetchWeatherForCenter);
      fetchWeatherForCenter(); // Initial fetch

      const resizeObserver = new ResizeObserver(() => {
        if (mapRef.current) {
          mapRef.current.invalidateSize();
        }
      });
      if (mapContainerElement) resizeObserver.observe(mapContainerElement);

      return () => {
        mapInstance.off('moveend', fetchWeatherForCenter);
        if (mapContainerElement) resizeObserver.unobserve(mapContainerElement);
        if (mapRef.current) {
          mapRef.current.remove();
          mapRef.current = null;
        }
      };
    }
  }, []);

  // Synchronize Intelligence Layers Visibility
  useEffect(() => {
    if (!mapRef.current) return;
    const map = mapRef.current;

    if (showOsintLayer) osintLayerRef.current.addTo(map);
    else osintLayerRef.current.remove();

    if (showHotspotsLayer) hotspotsLayerRef.current.addTo(map);
    else hotspotsLayerRef.current.remove();

    if (showHistoricalHotspotsLayer) historicalHotspotsLayerRef.current.addTo(map);
    else historicalHotspotsLayerRef.current.remove();

    if (showUavLayer) uavLayerRef.current.addTo(map);
    else uavLayerRef.current.remove();
  }, [showOsintLayer, showHotspotsLayer, showHistoricalHotspotsLayer, showUavLayer]);

  // Load saved PICC graphics from database
  useEffect(() => {
    const loadSavedGraphics = async () => {
      if (!mapRef.current) return;

      try {
        // Clear existing first
        (Object.values(piccTemplateLayersRef.current) as L.FeatureGroup[]).forEach(layer => layer.clearLayers());

        const graphics = await piccService.getAllGraphics();

        graphics.forEach(graphic => {
          const layer = operationalGraphicToLayer(graphic, DEFAULT_PICC_SYMBOL_SIZE);
          if (layer && piccTemplateLayersRef.current[graphic.plantillaType as PlantillaType]) {
            piccTemplateLayersRef.current[graphic.plantillaType as PlantillaType].addLayer(layer);
          }
        });

        console.log(`✅ PICC: Cargados ${graphics.length} gráficos operacionales desde BD`);
      } catch (error) {
        console.error('❌ PICC: Error cargando gráficos:', error);
      }
    };

    // Esperar un momento para que las capas estén inicializadas
    const timer = setTimeout(loadSavedGraphics, 500);

    const refreshSubscription = eventBus.subscribe('refreshPiccGraphics', () => {
      loadSavedGraphics();
    });

    return () => {
      clearTimeout(timer);
      eventBus.unsubscribe(refreshSubscription);
    };
  }, [eventBus]);

  // Effect to handle map resizing when sidebar/maximize state changes
  useEffect(() => {
    const handleResize = () => {
      if (mapRef.current) {
        mapRef.current.invalidateSize();
      }
    };

    // Immediate resize
    handleResize();

    // Resize after transition (300ms is standard for Tailwind transitions)
    const timeoutId = setTimeout(handleResize, 350);

    return () => clearTimeout(timeoutId);
  }, [isMaximized]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (activeDrawControlRef.current) {
      map.removeControl(activeDrawControlRef.current);
      activeDrawControlRef.current = null;
    }

    if (activeTemplateContext && piccTemplateLayersRef.current[activeTemplateContext] && !piccDrawingConfig) {
      if (typeof L !== 'undefined' && L.Control && (L.Control as any).Draw) {
        const editableLayer = piccTemplateLayersRef.current[activeTemplateContext];
        const drawControlInstance = new (L.Control as any).Draw({
          edit: { featureGroup: editableLayer, remove: true },
          draw: false,
        });
        (map as any).addControl(drawControlInstance);
        activeDrawControlRef.current = drawControlInstance;
      } else {
        console.error("L.Control.Draw is not available. PICC editing/deleting features will not work.");
      }
    }

    const handleEdited = (e: any) => { /* Placeholder */ };
    const handleDeleted = (e: any) => { /* Placeholder */ };

    map.on('draw:edited' as any, handleEdited);
    map.on('draw:deleted' as any, handleDeleted);

    return () => {
      if (activeDrawControlRef.current && mapRef.current) {
        mapRef.current.removeControl(activeDrawControlRef.current);
        activeDrawControlRef.current = null;
      }
      if (mapRef.current) {
        mapRef.current.off('draw:edited' as any, handleEdited);
        mapRef.current.off('draw:deleted' as any, handleDeleted);
      }
    };
  }, [activeTemplateContext, piccDrawingConfig]);


  useEffect(() => {
    if (!mapRef.current) return;

    if (typeof ms === 'undefined' || !ms || typeof ms.Symbol !== 'function') {
      console.error("Milsymbol library (ms) or ms.Symbol is not loaded/available. Unit symbols will not be rendered.");
      if (unitLayerRef.current) unitLayerRef.current.clearLayers();
      return;
    }

    const layer = unitLayerRef.current;
    if (!layer) return;

    layer.clearLayers();
    const isAnyToolActive = distanceToolActive || aoiDrawingModeActive || enemyInfluenceLayerActive || piccDrawingConfig || isTargetSelectionActive || elevationProfileActive;

    filteredUnits.forEach(unit => {
      if (!unit || !unit.location) return;
      const isSelected = selectedEntity?.type === MapEntityType.UNIT && selectedEntity.id === unit.id;
      const sidc = generateUnitSIDC(unit);
      const symbolSize = isSelected ? 30 : 25;
      let symbolSvg = '';
      try {
        symbolSvg = new ms.Symbol(sidc, {
          size: symbolSize,
          outlineColor: isSelected ? "white" : "black",
          outlineWidth: isSelected ? 2 : 1,
          infoFields: false,
          standard: "2525"
        }).asSVG();
      } catch (e) {
        console.warn(`Error generating SIDC SVG for ${unit.name} (SIDC: ${sidc}):`, e);
        symbolSvg = `<svg width="${symbolSize}" height="${symbolSize}" xmlns="http://www.w3.org/2000/svg"><rect x="0" y="0" width="${symbolSize}" height="${symbolSize}" fill="magenta"/><text x="${symbolSize / 2}" y="${symbolSize / 2}" dominant-baseline="middle" text-anchor="middle" fill="white" font-size="8">ERR: ${sidc.substring(0, 4)}</text></svg>`;
      }
      const iconHtml = `<div class="custom-leaflet-icon-wrapper ${isSelected ? 'selected' : ''}">${symbolSvg}<div class="unit-name-label">${unit.name.substring(0, 15)}</div></div>`;
      const labelHeight = 12; const totalHeight = symbolSize + labelHeight + 2;
      const estimatedLabelWidth = unit.name.substring(0, 15).length * 5 + 10;
      const iconWidth = Math.max(symbolSize + 4, estimatedLabelWidth);
      const customIcon = L.divIcon({ html: iconHtml, className: '', iconSize: [iconWidth, totalHeight], iconAnchor: [iconWidth / 2, totalHeight / 2 - labelHeight / 2], });
      const marker = L.marker([unit.location.lat, unit.location.lon], { icon: customIcon, zIndexOffset: isSelected ? 100 : 0 })
        .bindTooltip(`${unit.name} (${unit.type})<br/>Estado: ${unit.status}<br/>Ubic: ${decimalToDMS(unit.location)}<br/>SIDC: ${sidc}`);
      if (onSelectEntityOnMap) {
        marker.on('click', (e) => { if (!isAnyToolActive) { onSelectEntityOnMap({ type: MapEntityType.UNIT, id: unit.id }); L.DomEvent.stopPropagation(e); } });
      }
      layer.addLayer(marker);
    });
  }, [filteredUnits, selectedEntity, onSelectEntityOnMap, distanceToolActive, aoiDrawingModeActive, enemyInfluenceLayerActive, piccDrawingConfig, isTargetSelectionActive, elevationProfileActive]);

  useEffect(() => {
    if (!mapRef.current) return;
    const layer = intelLayerRef.current;
    layer.clearLayers();
    const isAnyToolActive = distanceToolActive || aoiDrawingModeActive || enemyInfluenceLayerActive || piccDrawingConfig || isTargetSelectionActive || elevationProfileActive;
    filteredIntel.forEach(intel => {
      if (!intel || !intel.location) return;
      const isSelected = selectedEntity?.type === MapEntityType.INTEL && selectedEntity.id === intel.id;
      const marker = L.marker([intel.location.lat, intel.location.lon], {
        icon: L.divIcon({
          html: `<svg viewBox="0 0 24 24" class="w-6 h-6" fill="${isSelected ? 'orange' : 'yellow'}" stroke="${isSelected ? 'black' : 'gray'}" stroke-width="1"><path d="M12 2L2 12l10 10 10-10L12 2z"></path></svg>`,
          className: 'custom-leaflet-icon-wrapper', iconSize: L.point(isSelected ? 30 : 24, isSelected ? 30 : 24), iconAnchor: L.point(isSelected ? 15 : 12, isSelected ? 15 : 12),
        }), zIndexOffset: isSelected ? 100 : 0
      }).bindTooltip(`${intel.title}<br/>Ubic: ${decimalToDMS(intel.location)}`);
      if (onSelectEntityOnMap) {
        marker.on('click', (e) => { if (!isAnyToolActive) { onSelectEntityOnMap({ type: MapEntityType.INTEL, id: intel.id }); L.DomEvent.stopPropagation(e); } });
      }
      layer.addLayer(marker);
    });
  }, [filteredIntel, selectedEntity, onSelectEntityOnMap, distanceToolActive, aoiDrawingModeActive, enemyInfluenceLayerActive, piccDrawingConfig, isTargetSelectionActive, elevationProfileActive]);



  // OSINT Layer removed duplicate block, logging instead
  useEffect(() => {
    console.log("OSINT Layer Active:", osintLayerActive, "Events:", osintEvents.length);
  }, [osintEvents, osintLayerActive]);

  // Sync OSINT layer visibility with prop
  useEffect(() => {
    if (!mapRef.current) return;
    if (osintLayerActive) {
      if (!mapRef.current.hasLayer(osintLayerRef.current)) {
        osintLayerRef.current.addTo(mapRef.current);
      }
    } else {
      if (mapRef.current.hasLayer(osintLayerRef.current)) {
        mapRef.current.removeLayer(osintLayerRef.current);
      }
    }
  }, [osintLayerActive]);

  // Tactical Link Graph Rendering
  useEffect(() => {
    if (!mapRef.current) return;
    const layer = linkGraphLayerRef.current;
    layer.clearLayers();

    const processedLinks = new Set<string>();

    filteredIntel.forEach(report => {
      if (!report || !report.location) return;
      if (!report.relatedReportIds) return;

      report.relatedReportIds.forEach(targetId => {
        const targetReport = filteredIntel.find(r => r.id === targetId);
        if (targetReport) {
          const linkKey = [report.id, targetId].sort().join('-');
          if (!processedLinks.has(linkKey)) {
            L.polyline(
              [[report.location.lat, report.location.lon], [targetReport.location.lat, targetReport.location.lon]],
              {
                color: '#facc15', // Yellow link lines
                weight: 1.5,
                dashArray: '5, 5',
                opacity: 0.7
              }
            ).addTo(layer);
            processedLinks.add(linkKey);
          }
        }
      });
    });
  }, [filteredIntel]);

  useEffect(() => {
    if (!mapRef.current) return;
    const layer = aarLayerRef.current;
    layer.clearLayers();
    const isAnyToolActive = distanceToolActive || aoiDrawingModeActive || enemyInfluenceLayerActive || piccDrawingConfig || isTargetSelectionActive || elevationProfileActive;
    afterActionReports.forEach(aar => {
      if (!aar || !aar.location) return;
      const isSelected = selectedEntity?.type === MapEntityType.AAR && selectedEntity.id === aar.id;
      const marker = L.marker([aar.location.lat, aar.location.lon], {
        icon: L.divIcon({
          html: `<svg viewBox="0 0 24 24" class="w-6 h-6" fill="${isSelected ? 'darkorchid' : 'purple'}" stroke="white" stroke-width="1"><circle cx="12" cy="12" r="10" /></svg>`,
          className: 'custom-leaflet-icon-wrapper', iconSize: L.point(isSelected ? 30 : 24, isSelected ? 30 : 24), iconAnchor: L.point(isSelected ? 15 : 12, isSelected ? 15 : 12),
        }), zIndexOffset: isSelected ? 100 : 0
      }).bindTooltip(`AAR: ${aar.unitName}<br/>Fecha: ${new Date(aar.reportTimestamp).toLocaleDateString('es-ES')}<br/>Ubic: ${decimalToDMS(aar.location)}`);
      if (onSelectEntityOnMap) {
        marker.on('click', (e) => { if (!isAnyToolActive) { onSelectEntityOnMap({ type: MapEntityType.AAR, id: aar.id }); L.DomEvent.stopPropagation(e); } });
      }
      layer.addLayer(marker);
    });
  }, [afterActionReports, selectedEntity, onSelectEntityOnMap, distanceToolActive, aoiDrawingModeActive, enemyInfluenceLayerActive, piccDrawingConfig, isTargetSelectionActive, elevationProfileActive]);

  useEffect(() => {
    if (!mapRef.current || typeof ms === 'undefined') return;
    const layer = artilleryLayerRef.current;
    layer.clearLayers();
    const isAnyToolActive = distanceToolActive || aoiDrawingModeActive || enemyInfluenceLayerActive || piccDrawingConfig || isTargetSelectionActive || elevationProfileActive;

    artilleryPieces.forEach(piece => {
      if (!piece || !piece.location) return;
      const isSelected = selectedEntity?.type === MapEntityType.ARTILLERY && selectedEntity.id === piece.id;
      const sidc = `S${SIDC_AFFILIATION_FRIEND}${SIDC_DIMENSION_GROUND}${SIDC_STATUS_PRESENT}${ARTILLERY_TYPE_DETAILS[piece.type].sidcFunctionId}-A---`;
      const symbolSize = isSelected ? 30 : 25;
      const symbolSvg = new ms.Symbol(sidc, { size: symbolSize, outlineColor: isSelected ? "white" : "black", outlineWidth: isSelected ? 2 : 1 }).asSVG();
      const iconHtml = `<div class="custom-leaflet-icon-wrapper ${isSelected ? 'selected' : ''}">${symbolSvg}<div class="unit-name-label">${piece.name}</div></div>`;
      const customIcon = L.divIcon({ html: iconHtml, className: '', iconSize: [symbolSize + 10, symbolSize + 12], iconAnchor: [(symbolSize + 10) / 2, (symbolSize + 12) / 2] });

      const marker = L.marker([piece.location.lat, piece.location.lon], { icon: customIcon, zIndexOffset: isSelected ? 200 : 100 })
        .bindTooltip(`${piece.name} (${piece.type})<br/>Estado: ${piece.status}<br/>Ubic: ${decimalToDMS(piece.location)}`);

      if (onSelectEntityOnMap) {
        marker.on('click', (e) => { if (!isAnyToolActive) { onSelectEntityOnMap({ type: MapEntityType.ARTILLERY, id: piece.id }); L.DomEvent.stopPropagation(e); } });
      }
      layer.addLayer(marker);
    });
  }, [artilleryPieces, selectedEntity, onSelectEntityOnMap, distanceToolActive, aoiDrawingModeActive, enemyInfluenceLayerActive, piccDrawingConfig, isTargetSelectionActive, elevationProfileActive]);

  // Render UAVs
  useEffect(() => {
    if (!mapRef.current || typeof ms === 'undefined') return;
    const layer = uavLayerRef.current;
    layer.clearLayers();
    const isAnyToolActive = distanceToolActive || aoiDrawingModeActive || enemyInfluenceLayerActive || piccDrawingConfig || isTargetSelectionActive || elevationProfileActive;

    units.forEach(unit => {
      if (!unit.uavAssets || unit.uavAssets.length === 0) return;

      unit.uavAssets.forEach(asset => {
        if (!asset || !asset.location) return;
        if (!asset.location) return; // Skip if no location

        const isSelected = selectedEntity?.type === MapEntityType.UNIT && selectedEntity.id === asset.id; // Or specific UAV entity type if we had one
        // SIDC: Friend, Air, Military, Fixed Wing, Drone => SFAPMFQ------
        // Or simpler: S F A P M F Q - - - - -
        const sidc = `SFAPMFQ------`;
        const symbolSize = isSelected ? 35 : 28;

        let symbolSvg = '';
        try {
          symbolSvg = new ms.Symbol(sidc, {
            size: symbolSize,
            uniqueDesignation: asset.id.split('-')[1], // Show ID number
            outlineColor: "cyan",
            outlineWidth: 2,
            infoFields: false
          }).asSVG();
        } catch (e) {
          symbolSvg = `<svg width="${symbolSize}" height="${symbolSize}"><circle cx="${symbolSize / 2}" cy="${symbolSize / 2}" r="${symbolSize / 3}" fill="cyan" stroke="white"/></svg>`;
        }

        const iconHtml = `<div class="custom-leaflet-icon-wrapper ${isSelected ? 'selected' : ''}">${symbolSvg}</div>`;
        const customIcon = L.divIcon({
          html: iconHtml,
          className: '',
          iconSize: [symbolSize + 2, symbolSize + 2],
          iconAnchor: [(symbolSize + 2) / 2, (symbolSize + 2) / 2]
        });

        const marker = L.marker([asset.location.lat, asset.location.lon], { icon: customIcon, zIndexOffset: 300 })
          .bindTooltip(`UAV: ${asset.id}<br/>Tipo: ${asset.type}<br/>Bat: ${asset.batteryStatus}%`);

        layer.addLayer(marker);
      });
    });
  }, [units, selectedEntity, distanceToolActive]);

  useEffect(() => {
    if (!mapRef.current || typeof ms === 'undefined') return;
    const layer = observerLayerRef.current;
    layer.clearLayers();
    const isAnyToolActive = distanceToolActive || aoiDrawingModeActive || enemyInfluenceLayerActive || piccDrawingConfig || isTargetSelectionActive || elevationProfileActive;

    forwardObservers.forEach(observer => {
      if (!observer || !observer.location) return;
      const isSelected = selectedEntity?.type === MapEntityType.FORWARD_OBSERVER && selectedEntity.id === observer.id;
      const sidc = `S${SIDC_AFFILIATION_FRIEND}${SIDC_DIMENSION_GROUND}${SIDC_STATUS_PRESENT}${SIDC_FORWARD_OBSERVER}-A---`;
      const symbolSize = isSelected ? 30 : 25;
      const symbolSvg = new ms.Symbol(sidc, { size: symbolSize, outlineColor: isSelected ? "white" : "black", outlineWidth: isSelected ? 2 : 1 }).asSVG();
      const iconHtml = `<div class="custom-leaflet-icon-wrapper ${isSelected ? 'selected' : ''}">${symbolSvg}<div class="unit-name-label">${observer.callsign}</div></div>`;
      const customIcon = L.divIcon({ html: iconHtml, className: '', iconSize: [symbolSize + 10, symbolSize + 12], iconAnchor: [(symbolSize + 10) / 2, (symbolSize + 12) / 2] });

      const marker = L.marker([observer.location.lat, observer.location.lon], { icon: customIcon, zIndexOffset: isSelected ? 200 : 100 })
        .bindTooltip(`Observador: ${observer.callsign}<br/>Estado: ${observer.status}<br/>Ubic: ${decimalToDMS(observer.location)}`);

      if (onSelectEntityOnMap) {
        marker.on('click', (e) => { if (!isAnyToolActive) { onSelectEntityOnMap({ type: MapEntityType.FORWARD_OBSERVER, id: observer.id }); L.DomEvent.stopPropagation(e); } });
      }
      layer.addLayer(marker);
    });
  }, [forwardObservers, selectedEntity, onSelectEntityOnMap, distanceToolActive, aoiDrawingModeActive, enemyInfluenceLayerActive, piccDrawingConfig, isTargetSelectionActive, elevationProfileActive]);

  useEffect(() => {
    if (!mapRef.current || typeof ms === 'undefined') return;
    const layer = fireMissionLayerRef.current;
    layer.clearLayers();

    activeFireMissions.forEach(mission => {
      const gun = artilleryPieces.find(p => p.id === mission.artilleryId);
      if (!gun || !gun.location || !mission.target) return;

      const targetSIDC = 'GHGPGP----'; // Hostile Ground Target Point
      const symbolSvg = new ms.Symbol(targetSIDC, { size: 25, outlineColor: "black", outlineWidth: 1 }).asSVG();
      const iconHtml = `<div class="custom-leaflet-icon-wrapper">${symbolSvg}<div class="unit-name-label">BLANCO</div></div>`;
      const customIcon = L.divIcon({ html: iconHtml, className: '', iconSize: [35, 37], iconAnchor: [17, 18] });

      L.marker([mission.target.lat, mission.target.lon], { icon: customIcon, zIndexOffset: 300 }).addTo(layer);

      const line = L.polyline(
        [[gun.location.lat, gun.location.lon], [mission.target.lat, mission.target.lon]],
        { color: 'red', weight: 1.5, dashArray: '10, 5' }
      ).bindTooltip(`Misión de Fuego: ${gun.name} -> Blanco`).addTo(layer);
    });
  }, [activeFireMissions, artilleryPieces]);

  useEffect(() => {
    const map = mapRef.current; if (!map) return;
    const isAnyToolActive = distanceToolActive || aoiDrawingModeActive || enemyInfluenceLayerActive || piccDrawingConfig || isTargetSelectionActive || elevationProfileActive;
    routeLayerRef.current.clearLayers();
    selectionHighlightLayerRef.current.clearLayers();
    artilleryRangeLayerRef.current.clearLayers();

    if (selectedEntity && !isAnyToolActive) {
      let entityLocation: GeoLocation | undefined;
      if (selectedEntity.type === MapEntityType.UNIT) {
        const unit = units.find(u => u.id === selectedEntity.id);
        if (unit) {
          entityLocation = unit.location;
          if (unit.routeHistory && unit.routeHistory.length > 1) L.polyline(unit.routeHistory.map(p => [p.lat, p.lon] as L.LatLngExpression), { color: 'rgba(59, 130, 246, 0.7)', weight: 3, dashArray: '5, 5' }).addTo(routeLayerRef.current);
          if (unit.areaOfOperations) {
            try {
              const parsedAo = typeof unit.areaOfOperations === 'string' ? JSON.parse(unit.areaOfOperations) : unit.areaOfOperations;
              if (parsedAo?.coordinates && parsedAo.coordinates.length > 0) {
                const leafletCoords = (parsedAo.coordinates[0] as unknown as Position[]).map(coord => [coord[1], coord[0]] as L.LatLngTuple);
                L.polygon(leafletCoords, {
                  color: 'rgba(0, 255, 255, 0.8)',
                  fillColor: 'rgba(0, 255, 255, 0.2)',
                  weight: 2.5,
                  dashArray: '5, 5'
                }).bindTooltip(`Área de Operaciones de ${unit.name}`).addTo(selectionHighlightLayerRef.current);
              }
            } catch (e) {
              console.error("Error parsing unit areaOfOperations:", e);
            }
          }
        }
      } else if (selectedEntity.type === MapEntityType.INTEL) {
        if (selectedEntity.id.startsWith('hotspot-')) {
          const idx = parseInt(selectedEntity.id.replace('hotspot-', ''));
          if (hotspots[idx]) entityLocation = hotspots[idx].center;
        } else {
          const intel = intelligenceReports.find(i => i.id === selectedEntity.id);
          if (intel) entityLocation = intel.location;
        }
      } else if (selectedEntity.type === MapEntityType.AAR) {
        const aar = afterActionReports.find(a => a.id === selectedEntity.id); if (aar) entityLocation = aar.location;
      } else if (selectedEntity.type === MapEntityType.ARTILLERY) {
        const piece = artilleryPieces.find(p => p.id === selectedEntity.id);
        if (piece) {
          entityLocation = piece.location;
          L.circle([piece.location.lat, piece.location.lon], { radius: piece.maxRange, color: '#facc15', weight: 1.5, dashArray: '10, 10', fillOpacity: 0.1, fillColor: '#facc15' }).bindTooltip(`Alcance Máximo: ${(piece.maxRange / 1000).toFixed(1)} km`).addTo(artilleryRangeLayerRef.current);
          L.circle([piece.location.lat, piece.location.lon], { radius: piece.minRange, color: '#f87171', weight: 1.5, dashArray: '5, 5', fillOpacity: 0.15, fillColor: '#f87171' }).bindTooltip(`Alcance Mínimo: ${(piece.minRange / 1000).toFixed(1)} km`).addTo(artilleryRangeLayerRef.current);
        }
      } else if (selectedEntity.type === MapEntityType.FORWARD_OBSERVER) { const obs = forwardObservers.find(o => o.id === selectedEntity.id); if (obs) entityLocation = obs.location; }

      if (entityLocation) {
        map.panTo([entityLocation.lat, entityLocation.lon]);
        L.circle([entityLocation.lat, entityLocation.lon], { radius: 100, color: 'rgba(255, 255, 255, 0.7)', fillColor: 'rgba(255, 255, 255, 0.3)', fillOpacity: 0.5, weight: 2, className: 'pulse-ring' }).addTo(selectionHighlightLayerRef.current);
      }
    }
  }, [selectedEntity, units, intelligenceReports, afterActionReports, artilleryPieces, forwardObservers, distanceToolActive, aoiDrawingModeActive, enemyInfluenceLayerActive, piccDrawingConfig, isTargetSelectionActive, elevationProfileActive]);

  useEffect(() => {
    const map = mapRef.current; if (!map) return;
    const handlePanToEntity = (_event: string, entityToPan: SelectedEntity) => {
      if (!entityToPan) return;

      let entityLocation: GeoLocation | undefined;
      if (entityToPan.type === MapEntityType.UNIT) {
        const unit = units.find(u => u.id === entityToPan.id);
        if (unit) entityLocation = unit.location;
      } // Add other entity types if needed

      if (entityLocation) {
        map.flyTo([entityLocation.lat, entityLocation.lon], 15);
      }
    };

    // Using a more generic pan event that could be used by voice command or other features
    const panToken = eventBus.subscribe('panToEntity', handlePanToEntity);

    // Specific handler for the prop-drilled entityToPanTo for immediate panning
    if (entityToPanTo && entityToPanTo.id !== lastPannedIdRef.current) {
      handlePanToEntity('panToEntity', entityToPanTo);
      lastPannedIdRef.current = entityToPanTo.id;
      // Clear the ref after a delay to allow re-panning later
      setTimeout(() => {
        if (lastPannedIdRef.current === entityToPanTo.id) {
          lastPannedIdRef.current = null;
        }
      }, 3000);
    }

    return () => {
      eventBus.unsubscribe(panToken);
    };
  }, [entityToPanTo, units, eventBus]);


  // --- OSINT LAYER ---
  useEffect(() => {
    const map = mapRef.current;
    const layer = osintLayerRef.current;
    if (!map || !layer) return;

    layer.clearLayers();

    if (osintLayerActive && osintEvents.length > 0) {
      osintEvents.forEach(event => {
        if (!event.location || event.location.lat === undefined || event.location.lon === undefined) return;

        // Determinar icono basado en el tipo de evento
        let iconHtml = '📢';
        let colorClass = 'bg-pink-500';

        const type = (event.eventType || '').toUpperCase();
        if (type.includes('ATAQUE') || type.includes('EXPLOSIÓN')) {
          iconHtml = '💥';
          colorClass = 'bg-red-600';
        } else if (type.includes('PROTESTA') || type.includes('DISTURBIO')) {
          iconHtml = '🚩';
          colorClass = 'bg-orange-500';
        } else if (type.includes('MILITAR') || type.includes('DESPLIEGUE')) {
          iconHtml = '🎖️';
          colorClass = 'bg-blue-600';
        } else if (type.includes('CRÍMEN') || type.includes('DELITO')) {
          iconHtml = '⚖️';
          colorClass = 'bg-gray-700';
        }

        const osintIcon = L.divIcon({
          html: `
            <div class="relative flex items-center justify-center">
              <div class="absolute w-8 h-8 ${colorClass} opacity-20 rounded-full animate-ping pointer-events-none"></div>
              <div class="w-8 h-8 ${colorClass} rounded-full flex items-center justify-center text-white shadow-lg border-2 border-white pointer-events-none">
                <span class="text-sm pointer-events-none">${iconHtml}</span>
              </div>
            </div>
          `,
          className: 'osint-event-icon',
          iconSize: [32, 32],
          iconAnchor: [16, 16]
        });

        const popupContent = `
          <div class="p-2 max-w-xs font-sans">
            <div class="flex items-center gap-2 mb-1.5">
              <span class="text-lg">${iconHtml}</span>
              <h4 class="font-bold text-white leading-tight text-sm">${event.title}</h4>
            </div>
            <p class="text-xs text-zinc-400 mb-2 italic">${event.locationName || 'Ubicación no especificada'}</p>
            <p class="text-[11px] text-zinc-300 line-clamp-3 mb-2 leading-relaxed">${event.summary}</p>
            <div class="flex justify-between items-center border-t border-white/15 pt-2 mt-2">
              <span class="text-[10px] font-bold text-pink-400 uppercase tracking-wider">${event.sourceName}</span>
              <a href="${event.sourceUrl}" target="_blank" rel="noopener noreferrer" class="text-[10px] bg-white/10 hover:bg-white/20 px-2 py-0.5 rounded text-white transition-colors border border-white/10 font-medium" style="color: #ffffff !important; text-decoration: none;">Ver fuente</a>
            </div>
            <p class="text-[9px] text-zinc-500 mt-1.5">Detectado: ${new Date(event.processedTimestamp).toLocaleString()}</p>
          </div>
        `;

        L.marker([event.location.lat, event.location.lon], { icon: osintIcon })
          .bindTooltip(popupContent, { 
            direction: 'top', 
            offset: [0, -15], 
            interactive: true,
            className: 'osint-tooltip-custom bg-slate-900 border border-slate-700 shadow-xl rounded-lg p-0',
            opacity: 1
          })
          .addTo(layer);
      });
    }
  }, [osintLayerActive, osintEvents]);

  // --- DISTANCE TOOL (Multi-segment Upgrade) ---
  useEffect(() => {
    const map = mapRef.current; if (!map) return;

    // Create markers/lines for active drawing
    const updateDistanceDrawing = () => {
      (distanceToolLayerRef.current as L.FeatureGroup).clearLayers();

      if (distancePoints.length === 0) return;

      // Draw markers
      distancePoints.forEach((p, idx) => {
        L.circleMarker(p, {
          radius: idx === 0 ? 5 : 4,
          color: idx === 0 ? 'green' : 'red',
          fillColor: '#f03',
          fillOpacity: 0.8
        }).addTo(distanceToolLayerRef.current);
      });

      // Draw polyline
      if (distancePoints.length > 1) {
        // Calculate total distance
        let totalDist = 0;
        for (let i = 0; i < distancePoints.length - 1; i++) {
          const from = turfPoint([distancePoints[i].lng, distancePoints[i].lat]);
          const to = turfPoint([distancePoints[i + 1].lng, distancePoints[i + 1].lat]);
          totalDist += turf.distance(from, to, { units: 'kilometers' });
        }

        const polyline = L.polyline(distancePoints, { color: 'red', weight: 2, dashArray: '5, 5' }).addTo(distanceToolLayerRef.current);

        // Tooltip on the last point showing total distance
        const lastPoint = distancePoints[distancePoints.length - 1];
        L.marker(lastPoint, { icon: L.divIcon({ className: 'hidden-icon' }) })
          .addTo(distanceToolLayerRef.current)
          .bindTooltip(`Distancia Total: ${totalDist.toFixed(2)} km${distancePoints.length > 2 ? ' (Click para añadir)' : ''}`, {
            permanent: true,
            direction: 'right',
            className: 'distance-tooltip font-bold bg-white text-black p-1 border rounded shadow'
          }).openTooltip();
      }
    };

    const handleMapClickForDistance = (e: L.LeafletMouseEvent) => {
      if (aoiDrawingModeActive || enemyInfluenceLayerActive || piccDrawingConfig || isTargetSelectionActive || elevationProfileActive) return;

      const newPoints = [...distancePoints, e.latlng];
      setDistancePoints(newPoints);
    };

    // Right click to remove last point
    const handleRightClick = () => {
      if (distancePoints.length > 0) {
        setDistancePoints(distancePoints.slice(0, -1));
      }
    };

    if (distanceToolActive) {
      map.on('click', handleMapClickForDistance);
      map.on('contextmenu', handleRightClick); // Right click removes last point
      map.getContainer().style.cursor = 'crosshair';
      selectionHighlightLayerRef.current.clearLayers();
      (aoiLayerRef.current as L.FeatureGroup).clearLayers();
      (searchResultMarkerLayerRef.current as L.FeatureGroup).clearLayers();
      enemyInfluencePolygonsRef.current.clearLayers();
      (Object.values(piccTemplateLayersRef.current) as L.FeatureGroup[]).forEach(fg => fg.clearLayers());

      updateDistanceDrawing();
    }
    else {
      map.off('click', handleMapClickForDistance);
      map.off('contextmenu', handleRightClick);
      if (!aoiDrawingModeActive && !enemyInfluenceLayerActive && !piccDrawingConfig && !isTargetSelectionActive && !elevationProfileActive)
        map.getContainer().style.cursor = '';
      (distanceToolLayerRef.current as L.FeatureGroup).clearLayers();
      // Only clear points if we want to reset on tool close. 
      // If we want to persist measurement until manually cleared, we'd manage that state in parent.
      // For now, clearing on close is standard behavior.
      if (distancePoints.length > 0) setDistancePoints([]);
    }
    return () => {
      map.off('click', handleMapClickForDistance);
      map.off('contextmenu', handleRightClick);
      if (!aoiDrawingModeActive && !distanceToolActive && !enemyInfluenceLayerActive && !piccDrawingConfig && !isTargetSelectionActive && !elevationProfileActive) map.getContainer().style.cursor = '';
    };
  }, [distanceToolActive, distancePoints, aoiDrawingModeActive, enemyInfluenceLayerActive, piccDrawingConfig, isTargetSelectionActive, elevationProfileActive]);



  useEffect(() => {
    const map = mapRef.current; if (!map) return;
    const clearAoiMapLayer = () => aoiLayerRef.current.clearLayers();
    const updateAoiDrawingLayer = (_msg: string, points: L.LatLng[]) => { 
      aoiLayerRef.current.clearLayers(); 
      points.forEach(p => L.circleMarker(p, { radius: 4, color: 'cyan', fillColor: '#0ff', fillOpacity: 0.7, interactive: false }).addTo(aoiLayerRef.current)); 
      if (points.length > 1) L.polyline(points, { color: 'cyan', weight: 2, dashArray: '3, 3', interactive: false }).addTo(aoiLayerRef.current); 
    };
    const finalizeAoiLayer = (_msg: string, geoJsonPolygon: GeoJSONFeature<GeoJSONPolygon>) => { 
      aoiLayerRef.current.clearLayers(); 
      if (geoJsonPolygon?.geometry?.coordinates) { 
        const leafletCoords = (geoJsonPolygon.geometry.coordinates[0] as unknown as Position[]).map(coord => [coord[1], coord[0]] as L.LatLngTuple); 
        L.polygon(leafletCoords, { color: 'rgba(0, 255, 255, 0.9)', fillColor: 'rgba(0, 255, 255, 0.3)', weight: 3 }).addTo(aoiLayerRef.current); 
      } 
    };

    const handleCompleteAoiDrawing = () => {
      console.log("[MapDisplayComponent] Evento completeAoiDrawing recibido");
      console.log("[MapDisplayComponent] aoiPolygonToolRef.current:", aoiPolygonToolRef.current);
      console.log("[MapDisplayComponent] aoiVertexCountRef.current:", aoiVertexCountRef.current);

      // Use the dedicated AOI tool ref — it is set when the tool is created and
      // never overwritten unless drawing is explicitly reset.
      const tool = aoiPolygonToolRef.current;

      if (!tool || typeof tool.completeShape !== 'function') {
        console.error("[MapDisplayComponent] No se encontró herramienta de dibujo activa.");
        alert("Error interno: la herramienta de dibujo no está activa. Por favor reactive el modo de dibujo.");
        return;
      }

      // Read vertex count directly from the tool's internal _markers array.
      // This is the most reliable source — if _markers is populated, vertices exist.
      const directCount = (tool._markers && Array.isArray(tool._markers)) ? tool._markers.length : 0;
      // Also use our patched counter as a fallback.
      const markerCount = Math.max(directCount, aoiVertexCountRef.current);

      console.log("[MapDisplayComponent] directCount (tool._markers):", directCount, "patchedCount:", aoiVertexCountRef.current, "finalCount:", markerCount);

      if (markerCount < 3) {
        alert(`Debe hacer clic en al menos 3 puntos del mapa para delimitar un área antes de establecerla. (Puntos detectados: ${markerCount})`);
        return;
      }

      try {
        tool.completeShape();
      } catch (err) {
        console.error("Error calling completeShape:", err);
      }
    };

    const handleDeactivateAoiDrawingMode = () => {
      if (aoiPolygonToolRef.current) {
        const tool = aoiPolygonToolRef.current;
        try { tool.disable(); } catch (_) { /* ignore */ }
        aoiPolygonToolRef.current = null;
      }
      aoiVertexCountRef.current = 0;
      currentPICCDrawingToolRef.current = null;
    };


    const clearToken = eventBus.subscribe('clearAoiLayer', clearAoiMapLayer);
    const updateToken = eventBus.subscribe('updateAoiDrawingLayer', updateAoiDrawingLayer);
    const finalizeToken = eventBus.subscribe('finalizeAoiLayer', finalizeAoiLayer);
    const completeToken = eventBus.subscribe('completeAoiDrawing', handleCompleteAoiDrawing);
    const deactivateToken = eventBus.subscribe('deactivateAoiDrawingMode', handleDeactivateAoiDrawingMode);

    return () => {
      eventBus.unsubscribe(clearToken);
      eventBus.unsubscribe(updateToken);
      eventBus.unsubscribe(finalizeToken);
      eventBus.unsubscribe(completeToken);
      eventBus.unsubscribe(deactivateToken);
    };
  }, [eventBus]);


  useEffect(() => {
    const map = mapRef.current; if (!map) return;
    let drawControl: any | null = null;
    const handleDrawCreated = (e: any) => {
      const layer = e.layer;
      elevationProfileLayerRef.current.clearLayers();
      elevationProfileLayerRef.current.addLayer(layer);
      eventBus.publish('elevationProfileDrawn', { latlngs: layer.getLatLngs() });
    };
    const clearElevationLayer = () => elevationProfileLayerRef.current.clearLayers();
    const clearToken = eventBus.subscribe('clearElevationProfileLayer', clearElevationLayer);

    if (elevationProfileActive) {
      map.getContainer().style.cursor = 'crosshair';
      drawControl = new L.Draw.Polyline(map as any, {
        shapeOptions: {
          color: '#8b5cf6', // purple-500
          weight: 3,
        }
      });
      drawControl.enable();
      map.on(L.Draw.Event.CREATED, handleDrawCreated);
    } else {
      if (drawControl && drawControl.disable) drawControl.disable();
      if (!distanceToolActive && !aoiDrawingModeActive && !piccDrawingConfig && !isTargetSelectionActive) {
        map.getContainer().style.cursor = '';
      }
    }

    // Listen for LOS Result drawing
    const drawLosToken = eventBus.subscribe('drawLosResult', (_msg: string, data: any) => {
      elevationProfileLayerRef.current.clearLayers();
      const { start, end, blocked, blockerLocation } = data;

      // Draw main line
      const color = blocked ? 'red' : 'lime';
      L.polyline([start, end], { color, weight: 3 }).addTo(elevationProfileLayerRef.current);

      // Draw markers
      L.marker(start, { icon: L.divIcon({ className: 'bg-blue-500 rounded-full w-3 h-3' }) }).addTo(elevationProfileLayerRef.current).bindTooltip("Observador");
      L.marker(end, { icon: L.divIcon({ className: 'bg-yellow-500 rounded-full w-3 h-3' }) }).addTo(elevationProfileLayerRef.current).bindTooltip("Objetivo");

      if (blocked && blockerLocation) {
        L.marker([blockerLocation.lat, blockerLocation.lon], {
          icon: L.divIcon({
            html: '❌',
            className: 'text-lg',
            iconSize: [20, 20],
            iconAnchor: [10, 10]
          })
        }).addTo(elevationProfileLayerRef.current).bindTooltip("Punto de Obstrucción").openTooltip();
      }
    });

    // Listen for Slope Analysis Result
    const drawSlopeToken = eventBus.subscribe('drawSlopeResult', (_msg: string, data: { segments: any[] }) => {
      elevationProfileLayerRef.current.clearLayers();
      const { segments } = data;

      segments.forEach((seg: any) => {
        let color = 'green';
        if (Math.abs(seg.slope) > 15) color = 'red';
        else if (Math.abs(seg.slope) > 5) color = 'yellow';

        L.polyline([seg.start, seg.end], { color, weight: 5, opacity: 0.8 }).addTo(elevationProfileLayerRef.current)
          .bindTooltip(`Pendiente: ${Math.abs(seg.slope).toFixed(1)}%`);
      });
    });

    const clearLosToken = eventBus.subscribe('clearLosLayer', () => elevationProfileLayerRef.current.clearLayers());

    return () => {
      if (map) {
        map.off(L.Draw.Event.CREATED, handleDrawCreated);
        if (drawControl) drawControl.disable();
      }
      eventBus.unsubscribe(clearToken);
    };
  }, [elevationProfileActive, distanceToolActive, aoiDrawingModeActive, piccDrawingConfig, isTargetSelectionActive, eventBus]);

  const fetchElevation = useCallback(async (lat: number, lon: number) => {
    setElevationDisplay("Elevación: Cargando...");
    try {
      const elevation = await weatherService.getElevation(lat, lon);
      if (elevation !== undefined) setElevationDisplay(`Elevación: ${Math.round(elevation)} m`);
      else setElevationDisplay("Elevación: N/A");
    } catch (error) { 
      console.warn("Error fetching elevation:", error); 
      setElevationDisplay("Elevación: Error"); 
    }
  }, []);

  useEffect(() => {
    const map = mapRef.current; if (!map) return;
    const throttledFetchElevation = (lat: number, lon: number) => { 
      if (fetchElevationTimeoutRef.current) clearTimeout(fetchElevationTimeoutRef.current); 
      fetchElevationTimeoutRef.current = window.setTimeout(() => fetchElevation(lat, lon), 200); // Faster response
    };
    const handleMouseMove = (e: L.LeafletMouseEvent) => throttledFetchElevation(e.latlng.lat, e.latlng.lng);
    const handleMouseOut = () => { if (fetchElevationTimeoutRef.current) clearTimeout(fetchElevationTimeoutRef.current); setElevationDisplay("Elevación: --- m"); };
    map.on('mousemove', handleMouseMove); map.on('mouseout', handleMouseOut);
    return () => { map.off('mousemove', handleMouseMove); map.off('mouseout', handleMouseOut); if (fetchElevationTimeoutRef.current) clearTimeout(fetchElevationTimeoutRef.current); };
  }, [fetchElevation]);

  useEffect(() => {
    const map = mapRef.current; if (!map) return;
    const handlePanToLocation = (_event: string, data: { location: GeoLocation, displayName: string, placeType: string }) => {
      (searchResultMarkerLayerRef.current as L.FeatureGroup).clearLayers();
      const marker = L.marker([data.location.lat, data.location.lon], { icon: L.divIcon({ html: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-8 h-8 text-cyan-500 drop-shadow-lg"><path fill-rule="evenodd" d="M11.54 22.351l.07.04.028.016a.76.76 0 00.723 0l.028-.015.071-.041a16.975 16.975 0 001.144-.742 19.58 19.58 0 002.683-2.282c1.944-1.99 3.963-4.98 3.963-8.827a8.25 8.25 0 00-16.5 0c0 3.846 2.02 6.837 3.963 8.827a19.58 19.58 0 002.682 2.282 16.975 16.975 0 001.145.742zM12 13.5a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" /></svg>`, className: 'custom-leaflet-icon-wrapper', iconSize: [32, 32], iconAnchor: [16, 32], }) }).addTo(searchResultMarkerLayerRef.current);
      const popupContent = `<div class="text-sm"><strong class="text-base block text-cyan-400 mb-1">${data.displayName}</strong><span class="text-zinc-300">Tipo: ${data.placeType}</span><br/><span class="text-zinc-300">Coords (GMS): ${decimalToDMS(data.location)}</span><br/><span class="text-zinc-300">Lat/Lon: ${data.location.lat.toFixed(5)}, ${data.location.lon.toFixed(5)}</span></div>`;
      marker.bindPopup(popupContent).openPopup(); map.setView([data.location.lat, data.location.lon], 13);
    };
    const handleClearSearchMarkers = () => searchResultMarkerLayerRef.current.clearLayers();

    const panToLocationToken = eventBus.subscribe('panToLocationAndShowInfo', handlePanToLocation);
    const clearSearchMarkersToken = eventBus.subscribe('clearGeospatialSearchMarkers', handleClearSearchMarkers);

    return () => {
      eventBus.unsubscribe(panToLocationToken);
      eventBus.unsubscribe(clearSearchMarkersToken);
    };
  }, [eventBus]);

  useEffect(() => {
    const map = mapRef.current; const layer = enemyInfluencePolygonsRef.current; if (!map || !layer) return; layer.clearLayers();
    if (enemyInfluenceLayerActive) {
      map.getContainer().style.cursor = 'default';
      (distanceToolLayerRef.current as L.FeatureGroup).clearLayers();
      (aoiLayerRef.current as L.FeatureGroup).clearLayers();
      (searchResultMarkerLayerRef.current as L.FeatureGroup).clearLayers();
      selectionHighlightLayerRef.current.clearLayers();
      (Object.values(piccTemplateLayersRef.current) as L.FeatureGroup[]).forEach(fg => fg.clearLayers());
      setDistancePoints([]);
      const relevantIntelReports = intelligenceReports.filter(report => INITIAL_ENEMY_FILTER_KEYWORDS.some(keyword => `${report.title.toLowerCase()} ${report.details.toLowerCase()}`.includes(keyword)));
      relevantIntelReports.forEach(intel => {
        if (!intel || !intel.location) return;
        const threatLevel = assessThreatLevel(intel); if (threatLevel === 'Ninguno') return; const style = getThreatStyle(threatLevel);
        try {
          const center = turfPoint([intel.location.lon, intel.location.lat]); const buffered = turf.buffer(center, style.radiusKm, { units: 'kilometers' });
          if (buffered?.geometry) {
            const polygonStyle = { color: style.color, fillColor: style.fillColor, fillOpacity: style.fillOpacity, weight: style.weight };
            const popupContent = `<div class="text-xs p-1"><strong class="block text-base text-red-400 mb-1.5 font-bold">Área de Influencia Enemiga</strong><p class="text-zinc-300 mb-0.5"><strong class="text-white">Intel Fuente:</strong> ${intel.title}</p><p class="text-zinc-300 mb-0.5"><strong class="text-white">Nivel de Amenaza:</strong> ${threatLevel}</p><p class="text-zinc-300 mb-0.5"><strong class="text-white">Radio Estimado:</strong> ${style.radiusKm} km</p><p class="text-zinc-300 mb-0.5"><strong class="text-white">Fiabilidad:</strong> ${intel.reliability}</p><p class="text-zinc-300"><strong class="text-white">Credibilidad:</strong> ${intel.credibility}</p></div>`;
            if (buffered.geometry.type === 'Polygon') { const leafletCoords = (buffered.geometry.coordinates as Position[][]).map(ring => ring.map(coord => [coord[1], coord[0]] as L.LatLngTuple)); L.polygon(leafletCoords, polygonStyle).bindPopup(popupContent).addTo(layer); }
            else if (buffered.geometry.type === 'MultiPolygon') { (buffered.geometry.coordinates as Position[][][]).forEach(polygonCoords => { const leafletCoords = polygonCoords.map(ring => ring.map(coord => [coord[1], coord[0]] as L.LatLngTuple)); L.polygon(leafletCoords, polygonStyle).bindPopup(popupContent).addTo(layer); }); }
          }
        } catch (e) { console.error("Error creando buffer para influencia enemiga:", e, intel); }
      });
    } else { if (!distanceToolActive && !aoiDrawingModeActive && !piccDrawingConfig && !isTargetSelectionActive && !elevationProfileActive) map.getContainer().style.cursor = ''; }
  }, [enemyInfluenceLayerActive, intelligenceReports, distanceToolActive, aoiDrawingModeActive, piccDrawingConfig, isTargetSelectionActive, elevationProfileActive]);


  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const handleMapClickForTarget = (e: L.LeafletMouseEvent) => {
      if (onTargetSelected) {
        onTargetSelected({ lat: e.latlng.lat, lon: e.latlng.lng });
      }
    };
    if (isTargetSelectionActive) {
      map.on('click', handleMapClickForTarget);
      map.getContainer().style.cursor = 'crosshair';
    } else {
      map.off('click', handleMapClickForTarget);
      if (!distanceToolActive && !aoiDrawingModeActive && !piccDrawingConfig && !elevationProfileActive && !isCoordinatePickingActive) {
        map.getContainer().style.cursor = '';
      }
    }
    return () => {
      if (map) {
        map.off('click', handleMapClickForTarget);
        if (!distanceToolActive && !aoiDrawingModeActive && !piccDrawingConfig && !isTargetSelectionActive && !elevationProfileActive && !isCoordinatePickingActive) {
          map.getContainer().style.cursor = '';
        }
      }
    }
  }, [isTargetSelectionActive, onTargetSelected, distanceToolActive, aoiDrawingModeActive, piccDrawingConfig, elevationProfileActive, isCoordinatePickingActive]);

  // Coordinate Picking (Generic)
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const handleMapClick = (e: L.LeafletMouseEvent) => {
      if (onCoordinatePicked) {
        onCoordinatePicked({ lat: e.latlng.lat, lon: e.latlng.lng });
      }
    };

    if (isCoordinatePickingActive) {
      map.on('click', handleMapClick);
      map.getContainer().style.cursor = 'crosshair';
      
      // Notify user via event bus for UI feedback if needed
      eventBus.publish('coordinatePickingStarted');
    } else {
      map.off('click', handleMapClick);
      if (!distanceToolActive && !aoiDrawingModeActive && !piccDrawingConfig && !isTargetSelectionActive && !elevationProfileActive) {
        map.getContainer().style.cursor = '';
      }
    }

    return () => {
      map.off('click', handleMapClick);
    };
  }, [isCoordinatePickingActive, onCoordinatePicked, distanceToolActive, aoiDrawingModeActive, piccDrawingConfig, isTargetSelectionActive, elevationProfileActive]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Always sync the ref immediately so the cleanup return() sees the current value.
    // This prevents stale-closure bugs when the effect re-runs due to dependency changes.
    aoiDrawingModeActiveRef.current = aoiDrawingModeActive;

    const handleDrawCreated = (e: LeafletDrawEvent) => {

      const layerType = e.layerType as string;
      const layer = e.layer as L.Layer & { options: any; setStyle?: (options: L.PathOptions) => void, getLatLngs?: () => L.LatLng[] | L.LatLng[][], getLatLng?: () => L.LatLng, getCenter?: () => L.LatLng, getBounds?: () => L.LatLngBounds, bindTooltip: (content: string | HTMLElement | L.Tooltip | Function, options?: L.TooltipOptions) => L.Layer, _latlngs?: L.LatLng[] | L.LatLng[][], _latlng?: L.LatLng, toGeoJSON: () => any };

      // ── AOI drawing: handle the completed polygon BEFORE the PICC guard ──
      // Without this, the early return below would discard the AOI silently.
      if (aoiDrawingModeActive) {
        const geoJsonPolygon = (layer as L.Polygon).toGeoJSON() as GeoJSONFeature<GeoJSONPolygon>;
        eventBus.publish('aoiDrawingFinished', geoJsonPolygon);
        map.removeLayer(layer); // Remove temporary Leaflet.Draw layer

        // Clean up dedicated AOI refs so the next session starts fresh
        if (aoiPolygonToolRef.current) {
          const oldTool = aoiPolygonToolRef.current;
          if ((oldTool as any)._vertexListener) {
            map.off(L.Draw.Event.DRAWVERTEX, (oldTool as any)._vertexListener);
          }
          aoiPolygonToolRef.current = null;
        }
        aoiVertexCountRef.current = 0;

        // Render the captured polygon on the map so the user can visually review it
        aoiLayerRef.current.clearLayers();
        if (geoJsonPolygon?.geometry?.coordinates) {
          const leafletCoords = (geoJsonPolygon.geometry.coordinates[0] as unknown as Position[]).map(coord => [coord[1], coord[0]] as L.LatLngTuple);
          L.polygon(leafletCoords, {
            color: 'cyan',
            fillColor: 'cyan',
            fillOpacity: 0.15,
            weight: 2,
            dashArray: '5, 5'
          }).addTo(aoiLayerRef.current);
        }
        return;
      }

      // Guard: if not in PICC drawing mode, nothing else to do
      if (!piccDrawingConfig || !activeTemplateContext) return;


      const targetLayerForDrawing = piccTemplateLayersRef.current[activeTemplateContext];
      if (!targetLayerForDrawing) {
        console.warn(`PICC target layer for ${activeTemplateContext} not found.`);
        return;
      }

      layer.options.activeTemplateContext = activeTemplateContext;

      const toolConfig = PlantillaPICCConfig[activeTemplateContext]?.elements.find(el => el.type === piccDrawingConfig.type);
      const defaultLabel = toolConfig?.label || piccDrawingConfig.type;

      let labelText = piccDrawingConfig.options?.labelPrompt
        ? window.prompt(piccDrawingConfig.options.labelPrompt, defaultLabel) || defaultLabel
        : defaultLabel;

      const sidcOptions = piccDrawingConfig.options?.sidcOptions;
      let finalSIDC = getPICCElementSIDC(piccDrawingConfig.type, sidcOptions);
      let piccSymbolSize = piccDrawingConfig.options?.defaultSymbolSize || DEFAULT_PICC_SYMBOL_SIZE;

      const createSymbolMarker = (latLng: L.LatLng, symbolSIDC: string, label: string) => {
        let symbolSvg = '';
        if (typeof ms === 'undefined' || !ms || typeof ms.Symbol !== 'function') {
          symbolSvg = `<svg width="${piccSymbolSize}" height="${piccSymbolSize}"><rect x="0" y="0" width="${piccSymbolSize}" height="${piccSymbolSize}" fill="red"/><text x="${piccSymbolSize / 2}" y="${piccSymbolSize / 2}" fill="white" font-size="8" text-anchor="middle" dy=".3em">MS ERR</text></svg>`;
        } else {
          try {
            symbolSvg = new ms.Symbol(symbolSIDC, { size: piccSymbolSize, outlineColor: "black", outlineWidth: 1, infoFields: false, standard: "2525" }).asSVG();
          } catch (symError) {
            console.error("Error creating PICC symbol:", symError, "SIDC:", symbolSIDC);
            const errorType = piccDrawingConfig?.type.substring(0, 6) || "SIDC";
            symbolSvg = `<svg width="${piccSymbolSize}" height="${piccSymbolSize}"><rect x="0" y="0" width="${piccSymbolSize}" height="${piccSymbolSize}" fill="magenta"/><text x="${piccSymbolSize / 2}" y="${piccSymbolSize / 2}" fill="white" font-size="8" text-anchor="middle" dy=".3em">ERR:${errorType}</text></svg>`;
          }
        }
        const piccIcon = L.divIcon({ html: symbolSvg, className: 'custom-leaflet-icon-wrapper', iconSize: [piccSymbolSize, piccSymbolSize], iconAnchor: [piccSymbolSize / 2, piccSymbolSize / 2] });
        const marker = L.marker(latLng, { icon: piccIcon });
        if (label) marker.bindTooltip(label, { permanent: true, direction: 'top', offset: L.point(0, - (piccSymbolSize / 2) - 2), className: 'picc-label' });
        if (activeTemplateContext) { if (!marker.options) marker.options = {}; (marker.options as any).activeTemplateContext = activeTemplateContext; }
        targetLayerForDrawing.addLayer(marker);
      };

      const isPointSymbolType = [
        PICCElementType.ENEMY_UNIT_POINT_SIT, PICCElementType.FRIENDLY_UNIT_POINT_SIT,
        PICCElementType.NEUTRAL_POINT_SIT, PICCElementType.CIVILIAN_POINT_SIT,
        PICCElementType.NAI_POINT, PICCElementType.TARGET_REFERENCE_POINT,
        PICCElementType.CONTROL_CHECKPOINT, PICCElementType.OBSTACLE_DEMOLITION_PLANNED
      ].includes(piccDrawingConfig.type);

      if (isPointSymbolType) {
        const markerLatLng = layer.getLatLng ? layer.getLatLng() : (layer as any)._latlng;
        if (markerLatLng) {
          createSymbolMarker(markerLatLng, finalSIDC, labelText);
        }
        if (map.hasLayer(layer) && layerType === 'marker') {
          map.removeLayer(layer);
        }
      } else {
        const pathStyle = piccDrawingConfig.options?.pathOptions ||
          (piccDrawingConfig.type === PICCElementType.CONTROL_PHASE_LINE ? PICC_PATH_OPTIONS_CONTROL : PICC_PATH_OPTIONS_NEUTRAL);
        if (layer.setStyle) layer.setStyle(pathStyle);

        if (piccDrawingConfig.type === PICCElementType.CONTROL_PHASE_LINE && (layerType === 'polyline' || (layer as L.Polyline).getLatLngs)) {
          const latlngs = (layer as L.Polyline).getLatLngs();
          const linePoints = Array.isArray(latlngs[0]) ? latlngs[0] as L.LatLng[] : latlngs as L.LatLng[];

          if (linePoints.length >= 2) {
            const startPoint = linePoints[0];
            const endPoint = linePoints[linePoints.length - 1];
            const labelContent = labelText || "LF";

            const createLabelMarker = (point: L.LatLng, text: string) => {
              const labelIcon = L.divIcon({
                className: 'picc-label-marker',
                html: `<div class="picc-label">${text}</div>`,
                iconSize: L.point(text.length * 6 + 10, 16),
                iconAnchor: L.point((text.length * 6 + 10) / 2, 8)
              });
              const lfMarker = L.marker(point, { icon: labelIcon });
              (lfMarker.options as any).activeTemplateContext = activeTemplateContext;
              targetLayerForDrawing.addLayer(lfMarker);
            };
            createLabelMarker(startPoint, labelContent);
            createLabelMarker(endPoint, labelContent);
          }
        } else if (labelText && (layer as any).bindTooltip) {
          (layer as any).bindTooltip(labelText, { permanent: true, direction: 'center', className: 'picc-label' }).openTooltip();
        }

        // Enhanced symbology for attack axes
        if (
          (piccDrawingConfig.type === PICCElementType.FRIENDLY_MAIN_ATTACK_AXIS ||
            piccDrawingConfig.type === PICCElementType.FRIENDLY_SUPPORTING_ATTACK_AXIS ||
            piccDrawingConfig.type === PICCElementType.ENEMY_COA_AXIS) &&
          (layerType === 'polyline' || (layer as L.Polyline).getLatLngs)
        ) {
          const axisColor = pathStyle.color || '#0000FF';
          enhanceAttackAxis(
            layer as L.Polyline,
            piccDrawingConfig.type,
            targetLayerForDrawing,
            axisColor
          );
        }

        // Add layer to map
        targetLayerForDrawing.addLayer(layer);

        // Enhanced symbology for areas (objectives, assembly areas, obstacles)
        if (layerType === 'polygon' || (layer as L.Polygon).getLatLngs) {
          const polygon = layer as L.Polygon;

          // Add center symbol for tactical areas
          addCenterSymbolToArea(polygon, piccDrawingConfig.type, targetLayerForDrawing);

          // Apply fill patterns for obstacles and special areas
          applyFillPattern(polygon, piccDrawingConfig.type);
        }
      }

      // Save PICC graphic to database
      (async () => {
        try {
          const graphicData = layerToOperationalGraphic(
            layer,
            activeTemplateContext,
            piccDrawingConfig.type,
            labelText
          );

          if (graphicData) {
            const savedGraphic = await piccService.saveGraphic(graphicData);
            // Store the database ID in the layer for future operations
            (layer as any).options.piccId = savedGraphic.id;
            console.log('✅ PICC: Gráfico guardado en BD:', savedGraphic.id);
          }
        } catch (error) {
          console.error('❌ PICC: Error guardando gráfico:', error);
          // Don't remove the layer even if save fails - user can still see it
        }
      })();


      if (currentPICCDrawingToolRef.current) {
        currentPICCDrawingToolRef.current.enable();
      }
    };
    map.on('draw:created', handleDrawCreated as any);


    if (piccDrawingConfig && activeTemplateContext || aoiDrawingModeActive) {
      if (typeof L === 'undefined' || !(L as any).Draw || !((L as any).Draw).Polyline || !((L as any).Draw).Polygon || !((L as any).Draw).Marker) {
        console.error("Leaflet.Draw components are not available. Cannot activate drawing tool.");
        if (onPiccDrawingCompleteRef.current) onPiccDrawingCompleteRef.current();
        return;
      }

      if (activeDrawControlRef.current) {
        map.removeControl(activeDrawControlRef.current);
        activeDrawControlRef.current = null;
      }

      if (aoiDrawingModeActive) {
        map.getContainer().style.cursor = 'crosshair';

        // ── Guard: if aoiPolygonToolRef already has a tool, NEVER create a new one ──
        // This is the simplest and most robust guard: as long as the ref is non-null,
        // the tool from the ORIGINAL creation is still the one active on the map.
        if (aoiPolygonToolRef.current) {
          console.log("[MapDisplayComponent] AOI useEffect re-ran — tool already stored, skipping re-instantiation. _markers:", aoiPolygonToolRef.current._markers?.length);
          // Keep currentPICCDrawingToolRef in sync just in case
          currentPICCDrawingToolRef.current = aoiPolygonToolRef.current;
        } else {
          // ── Fresh instantiation ──
          aoiVertexCountRef.current = 0;

          const aoiPolygonTool = new ((L as any).Draw).Polygon(map, {
            shapeOptions: {
              color: 'cyan',
              fillColor: '#0ff',
              fillOpacity: 0.2,
              weight: 2,
              dashArray: '5, 5'
            }
          });

          // ── Monkey-patch addVertex to track count directly on the instance ──
          // This is the most reliable vertex tracking: it fires synchronously when
          // the user clicks, independent of React re-renders or event routing.
          const origAddVertex = aoiPolygonTool.addVertex?.bind(aoiPolygonTool);
          if (origAddVertex) {
            aoiPolygonTool.addVertex = function(latlng: L.LatLng) {
              origAddVertex(latlng);
              // Read directly from _markers after the vertex is added
              aoiVertexCountRef.current = aoiPolygonTool._markers ? aoiPolygonTool._markers.length : 0;
              console.log("[MapDisplayComponent] addVertex patched — count now:", aoiVertexCountRef.current);
            };
          }

          aoiPolygonToolRef.current = aoiPolygonTool;
          currentPICCDrawingToolRef.current = aoiPolygonTool;
          aoiPolygonTool.enable();
        }
      } else if (piccDrawingConfig && activeTemplateContext) {
        (distanceToolLayerRef.current as L.FeatureGroup).clearLayers();
        (aoiLayerRef.current as L.FeatureGroup).clearLayers();
        (searchResultMarkerLayerRef.current as L.FeatureGroup).clearLayers();
        enemyInfluencePolygonsRef.current.clearLayers();
        selectionHighlightLayerRef.current.clearLayers();

        const defaultPathOptionsForDrawing = piccDrawingConfig.options?.pathOptions || PICC_PATH_OPTIONS_NEUTRAL;
        const toolType = piccDrawingConfig.type;
        const upperToolType = toolType.toUpperCase();

        const isPICCPointSymbolType = [
          PICCElementType.ENEMY_UNIT_POINT_SIT, PICCElementType.FRIENDLY_UNIT_POINT_SIT,
          PICCElementType.NEUTRAL_POINT_SIT, PICCElementType.CIVILIAN_POINT_SIT,
          PICCElementType.NAI_POINT, PICCElementType.TARGET_REFERENCE_POINT,
          PICCElementType.CONTROL_CHECKPOINT, PICCElementType.OBSTACLE_DEMOLITION_PLANNED
        ].includes(toolType);

        let leafletDrawTool: any;
        const shapeOptions = { shapeOptions: defaultPathOptionsForDrawing };

        if (upperToolType.includes('LINE') || upperToolType.includes('AXIS')) {
          leafletDrawTool = new ((L as any).Draw).Polyline(map, shapeOptions);
        } else if (upperToolType.includes('AREA')) {
          leafletDrawTool = new ((L as any).Draw).Polygon(map, shapeOptions);
        } else if (isPICCPointSymbolType) {
          leafletDrawTool = new ((L as any).Draw).Marker(map, {
            icon: L.divIcon({
              className: 'leaflet-draw-marker-icon',
              html: `<div style="background-color: ${defaultPathOptionsForDrawing?.color || 'gray'}; width: 10px; height: 10px; border-radius: 50%; border: 1px solid white; box-shadow: 0 0 3px black;"></div>`,
              iconSize: [12, 12], iconAnchor: [6, 6]
            }),
          });
        } else {
          leafletDrawTool = new ((L as any).Draw).Marker(map as any, { /* default icon */ });
        }
        currentPICCDrawingToolRef.current = leafletDrawTool;
        currentPICCDrawingToolRef.current?.enable();
      }
      if (!distanceToolActive && !aoiDrawingModeActive && !enemyInfluenceLayerActive && !isTargetSelectionActive && !elevationProfileActive && !isCoordinatePickingActive) map.getContainer().style.cursor = '';
    }

    return () => {
      map.off('draw:created', handleDrawCreated as any);

      // Use the ref (not the closure variable) to check whether aoiDrawingMode
      // is CURRENTLY active at cleanup time. This avoids the stale-closure bug
      // where the cleanup sees the OLD value of aoiDrawingModeActive.
      const isStillDrawing = aoiDrawingModeActiveRef.current;

      // Only fully tear down the AOI tool when drawing mode has been turned OFF.
      if (!isStillDrawing && aoiPolygonToolRef.current) {
        const tool = aoiPolygonToolRef.current;
        try { tool.disable(); } catch (_) { /* ignore */ }
        aoiPolygonToolRef.current = null;
        aoiVertexCountRef.current = 0;
      }


      if (currentPICCDrawingToolRef.current && currentPICCDrawingToolRef.current !== aoiPolygonToolRef.current) {
        console.log("Disabling active PICC drawing tool in cleanup");
        try { currentPICCDrawingToolRef.current.disable(); } catch (_) { /* ignore */ }
        currentPICCDrawingToolRef.current = null;
      } else if (!isStillDrawing) {
        currentPICCDrawingToolRef.current = null;
      }

      map.dragging.enable();
    };
  }, [piccDrawingConfig, activeTemplateContext, distanceToolActive, aoiDrawingModeActive, aoDrawingUnitId, enemyInfluenceLayerActive, isTargetSelectionActive, elevationProfileActive, isCoordinatePickingActive]);


  useEffect(() => {
    const handleClearPicc = (_event: string, templateToClear?: PlantillaType) => {
      if (templateToClear && piccTemplateLayersRef.current[templateToClear]) {
        piccTemplateLayersRef.current[templateToClear].clearLayers();
      } else if (!templateToClear) {
        (Object.values(piccTemplateLayersRef.current) as L.FeatureGroup[]).forEach(layer => layer.clearLayers());
      }
    };
    const token = eventBus.subscribe('clearPiccLayer', handleClearPicc);
    return () => {
      eventBus.unsubscribe(token);
    };
  }, [eventBus]);

  // Handle PICC graphic deletion
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const handleDrawDeleted = async (e: any) => {
      const layers = e.layers;

      layers.eachLayer(async (layer: any) => {
        const piccId = layer.options?.piccId;

        if (piccId) {
          try {
            await piccService.deleteGraphic(piccId);
            console.log('✅ PICC: Gráfico eliminado de BD:', piccId);
          } catch (error) {
            console.error('❌ PICC: Error eliminando gráfico:', error);
          }
        }
      });
    };

    map.on('draw:deleted', handleDrawDeleted);

    return () => {
      map.off('draw:deleted', handleDrawDeleted);
    };
  }, []);

  // Handle COA Plan visualization
  useEffect(() => {
    const handleNewCOAPlan = (_msg: string, plan: COAPlan) => {
      const map = mapRef.current;
      if (!map) return;

      // Clear previous COA layers
      coaLayerRef.current.forEach(layerGroup => {
        if (map.hasLayer(layerGroup)) {
          map.removeLayer(layerGroup);
        }
      });
      coaLayerRef.current = [];

      // Convert COA plan to Leaflet layers
      const phaseLayers = coaPlanToLayers(plan);
      coaLayerRef.current = phaseLayers;

      // Add all phase layers to map
      phaseLayers.forEach((phaseLayer, index) => {
        phaseLayer.addTo(map);
        console.log(`✅ COA: Fase ${index + 1} agregada al mapa`);
      });

      // Zoom to COA bounds
      const bounds = getCOAPlanBounds(plan);
      if (bounds) {
        map.fitBounds(bounds, { padding: [50, 50] });
      }

      // Store current plan
      setCurrentCOAPlan(plan);

      // Show success notification
      console.log(`✅ COA: Plan "${plan.planName}" visualizado en mapa`);
      alert(`Plan COA "${plan.planName}" ha sido visualizado en el mapa.\n\n${phaseLayers.length} fases dibujadas.`);
    };

    const handleClearCOA = () => {
      const map = mapRef.current;
      coaLayerRef.current.forEach(layerGroup => {
        if (map && map.hasLayer(layerGroup)) {
          map.removeLayer(layerGroup);
        }
      });
      coaLayerRef.current = [];
      setCurrentCOAPlan(null);
      console.log('✅ COA: Capas limpiadas');
    };

    const tokenNew = eventBus.subscribe('newCOAPlan', handleNewCOAPlan);
    const tokenClear = eventBus.subscribe('clearCOALayer', handleClearCOA);

    // Initial check (if a plan was already loaded before this component mounted?)
    // This is optional but good for hot-reloading or complex navigation

    return () => {
      eventBus.unsubscribe(tokenNew);
      eventBus.unsubscribe(tokenClear);
    };
  }, [eventBus]);


  useEffect(() => {
    const layer = hotspotsLayerRef.current;
    if (!layer || !mapRef.current) return;
    layer.clearLayers();

    hotspots.forEach(hotspot => {
      if (!hotspot || !hotspot.center) return;
      const circle = L.circle([hotspot.center.lat, hotspot.center.lon], {
        radius: hotspot.radius * 1000,
        color: '#7C3AED', // Purple
        fillColor: '#8B5CF6',
        fillOpacity: 0.15,
        weight: 1,
        dashArray: '5, 5'
      });

      const tooltip = L.tooltip({
        permanent: false,
        direction: 'top',
        className: 'bg-purple-900 border-purple-700 text-purple-100 text-[10px] font-bold p-1 rounded font-sans'
      }).setContent(`PUNTO CRÍTICO BMA: ${hotspot.description}`);

      circle.bindTooltip(tooltip);
      circle.addTo(layer);
    });
  }, [hotspots]);

  useEffect(() => {
    const layer = weatherAlertLayerRef.current;
    if (!layer || !mapRef.current) return;
    layer.clearLayers();

    if (weatherInfo?.isThunderstorm) {
      const center = mapRef.current.getCenter();
      const stormIcon = L.divIcon({
        html: `
          <div class="relative flex items-center justify-center animate-pulse">
            <div class="absolute w-12 h-12 bg-yellow-500/20 rounded-full animate-ping"></div>
            <svg viewBox="0 0 24 24" class="w-10 h-10 text-yellow-400 drop-shadow-[0_0_8px_rgba(234,179,8,0.8)]" fill="currentColor">
              <path d="M14.615 1.595a.75.75 0 01.359.852L12.972 9.5h5.528a.75.75 0 01.592 1.21l-8.122 10.83a.75.75 0 01-1.297-.741l1.625-7.3H5.75a.75.75 0 01-.592-1.21L13.28 1.83a.75.75 0 011.335-.235z"/>
            </svg>
          </div>
        `,
        className: 'custom-storm-icon',
        iconSize: [40, 40],
        iconAnchor: [20, 20]
      });

      L.marker([center.lat, center.lng], { icon: stormIcon, interactive: true })
        .addTo(layer)
        .bindTooltip("<b>¡ALERTA DE TORMENTA!</b><br/>Actividad eléctrica detectada en la zona.", {
          permanent: true,
          direction: 'top',
          className: 'bg-yellow-900 border-yellow-500 text-yellow-100 text-[10px] font-bold p-1 rounded font-sans shadow-lg'
        });
    }
  }, [weatherInfo]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const fetchCurrentMapWeather = async () => {
      const center = map.getCenter();
      try {
        const info = await weatherService.getCurrentWeather(center.lat, center.lng);
        setWeatherInfo(info);
      } catch (e) {
        console.error("Error fetching map center weather:", e);
      }
    };

    fetchCurrentMapWeather();
    const interval = setInterval(fetchCurrentMapWeather, 300000); // Check every 5 mins

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const layer = historicalHotspotsLayerRef.current;
    if (!layer || !mapRef.current) return;
    layer.clearLayers();

    const timeLimitAdjusted = Date.now() - (timeOffsetHours * 60 * 60 * 1000);

    historicalHotspots.forEach(hotspot => {
      if (!hotspot || !hotspot.center) return;
      // Historical hotspots in BMA normally don't have individual timestamps in the DTO, 
      // but the service filters them. We'll show them as ghosts if the slider is moved.
      if (timeOffsetHours > 48) return; // Hide if we're looking older than the historical window
      const circle = L.circle([hotspot.center.lat, hotspot.center.lon], {
        radius: hotspot.radius * 1000,
        color: '#4B5563', // Gray
        fillColor: '#6B7280',
        fillOpacity: 0.1,
        weight: 1,
        dashArray: '2, 4'
      });

      const tooltip = L.tooltip({
        permanent: false,
        direction: 'top',
        className: 'bg-gray-800 border-gray-700 text-gray-400 text-[9px] font-bold p-1 rounded font-sans'
      }).setContent(`HISTÓRICO: ${hotspot.description}`);

      circle.bindTooltip(tooltip);
      circle.addTo(layer);
    });
  }, [historicalHotspots]);

  return (
    <div className="w-full h-full bg-gray-700 rounded-lg overflow-hidden relative shadow-inner">
      <div className="absolute top-0 left-0 right-0 p-2 z-[1000] bg-gray-800 bg-opacity-75 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <h3 className="text-md md:text-lg font-semibold text-gray-200">Mapa Operacional</h3>
          <button
            onClick={() => setIs3DActive(!is3DActive)}
            className="px-3 py-1 bg-slate-900 border border-slate-700 hover:bg-slate-800 text-sky-400 rounded-md text-xs font-bold transition flex items-center gap-1 shadow-md"
            title="Alternar entre mapa 2D (Leaflet) y 3D (Cesium)"
          >
            {is3DActive ? '🗺️ Vista 2D' : '🌐 Vista 3D'}
          </button>
        </div>
        <div className="relative">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="p-2 bg-gray-800 bg-opacity-80 rounded-full shadow-lg hover:bg-opacity-100 transition-colors mr-2"
            title="Mostrar/Ocultar Filtros de Capa"
            aria-label="Mostrar u ocultar los filtros de capa del mapa"
          >
            <AdjustmentsHorizontalIcon className="w-5 h-5 text-white" />
          </button>

          <button
            onClick={onToggleMaximize}
            className="p-2 bg-gray-800 bg-opacity-80 rounded-full shadow-lg hover:bg-opacity-100 transition-colors"
            title={isMaximized ? "Restaurar tamaño lateral" : "Maximizar Mapa"}
            aria-label={isMaximized ? "Restaurar tamaño lateral" : "Maximizar Mapa"}
          >
            {isMaximized ? (
              <ArrowsPointingInIcon className="w-5 h-5 text-teal-400" />
            ) : (
              <ArrowsPointingOutIcon className="w-5 h-5 text-white" />
            )}
          </button>
          {showFilters && (
            <div className="absolute top-full right-0 mt-2 bg-gray-800 bg-opacity-90 p-3 rounded-lg shadow-lg w-60 space-y-3">
              <h4 className="text-sm font-semibold text-gray-200 border-b border-gray-600 pb-1">Filtros de Capa</h4>

              <div className="space-y-2">
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Capas de Inteligencia</p>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-300">Hotspots (BMA)</span>
                  <button
                    onClick={() => setShowHotspotsLayer(!showHotspotsLayer)}
                    className={`w-8 h-4 rounded-full transition-colors relative ${showHotspotsLayer ? 'bg-orange-600' : 'bg-gray-600'}`}
                  >
                    <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all ${showHotspotsLayer ? 'left-4.5' : 'left-0.5'}`} />
                  </button>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-300">Histórico Hotspots</span>
                  <button
                    onClick={() => setShowHistoricalHotspotsLayer(!showHistoricalHotspotsLayer)}
                    className={`w-8 h-4 rounded-full transition-colors relative ${showHistoricalHotspotsLayer ? 'bg-yellow-600' : 'bg-gray-600'}`}
                  >
                    <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all ${showHistoricalHotspotsLayer ? 'left-4.5' : 'left-0.5'}`} />
                  </button>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-300">OSINT: Noticias Seg. (IA)</span>
                  <button
                    onClick={() => setShowOsintLayer(!showOsintLayer)}
                    className={`w-8 h-4 rounded-full transition-colors relative ${showOsintLayer ? 'bg-pink-600' : 'bg-gray-600'}`}
                  >
                    <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all ${showOsintLayer ? 'left-4.5' : 'left-0.5'}`} />
                  </button>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-300">Activos UAV</span>
                  <button
                    onClick={() => setShowUavLayer(!showUavLayer)}
                    className={`w-8 h-4 rounded-full transition-colors relative ${showUavLayer ? 'bg-cyan-600' : 'bg-gray-600'}`}
                  >
                    <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all ${showUavLayer ? 'left-4.5' : 'left-0.5'}`} />
                  </button>
                </div>
                <div className="flex items-center justify-between border-t border-gray-700 pt-2">
                  <span className="text-xs text-teal-400 font-bold">Clima Táctico (Windy)</span>
                  <button
                    onClick={() => {
                      const active = !showWindyTacticalPanel;
                      setShowWindyTacticalPanel(active);
                      if (active && mapRef.current) {
                        const center = mapRef.current.getCenter();
                        setWindyCoords({ lat: center.lat, lon: center.lng, zoom: mapRef.current.getZoom() });
                      }
                    }}
                    className={`w-8 h-4 rounded-full transition-colors relative ${showWindyTacticalPanel ? 'bg-teal-500' : 'bg-gray-600'}`}
                  >
                    <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all ${showWindyTacticalPanel ? 'left-4.5' : 'left-0.5'}`} />
                  </button>
                </div>
              </div>

              <div className="border-t border-gray-700 pt-2">
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">Filtros de Atributos</p>

                <div>
                  <label htmlFor="unitStatusFilter" className="block text-xs font-medium text-gray-400">Estado de Unidad</label>
                  <select id="unitStatusFilter" value={unitStatusFilter} onChange={e => setUnitStatusFilter(e.target.value as UnitStatus | 'ALL')}
                    className="mt-1 block w-full bg-gray-700 border-gray-600 rounded-md shadow-sm p-1.5 text-xs text-white">
                    <option value="ALL">Todos los Estados</option>
                    {(Object.values(UnitStatus) as string[]).map(status => <option key={status} value={status}>{status}</option>)}
                  </select>
                </div>

                <div>
                  <label htmlFor="unitTypeFilter" className="block text-xs font-medium text-gray-400">Tipo de Unidad</label>
                  <select id="unitTypeFilter" value={unitTypeFilter} onChange={e => setUnitTypeFilter(e.target.value as UnitType | 'ALL')}
                    className="mt-1 block w-full bg-gray-700 border-gray-600 rounded-md shadow-sm p-1.5 text-xs text-white">
                    <option value="ALL">Todos los Tipos</option>
                    {(Object.values(UnitType) as string[]).map(type => <option key={type} value={type}>{type}</option>)}
                  </select>
                </div>

                <div>
                  <label htmlFor="intelReliabilityFilter" className="block text-xs font-medium text-gray-400">Fiabilidad de Inteligencia</label>
                  <select id="intelReliabilityFilter" value={intelReliabilityFilter} onChange={e => setIntelReliabilityFilter(e.target.value as IntelligenceReliability | 'ALL')}
                    className="mt-1 block w-full bg-gray-700 border-gray-600 rounded-md shadow-sm p-1.5 text-xs text-white">
                    <option value="ALL">Todas las Fiabilidades</option>
                    {(Object.values(IntelligenceReliability) as string[]).map(rel => <option key={rel} value={rel}>{rel}</option>)}
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div id="map-container" className={`w-full h-full ${is3DActive ? 'hidden' : ''}`} />
      {is3DActive && (
        <Map3DDisplayComponent
          units={units}
          intelligenceReports={intelligenceReports}
          selectedEntity={selectedEntity}
          onSelectEntityOnMap={onSelectEntityOnMap}
          isCoordinatePickingActive={isCoordinatePickingActive}
          onCoordinatePicked={onCoordinatePicked}
          isTargetSelectionActive={isTargetSelectionActive}
          onTargetSelected={onTargetSelected}
          distanceToolActive={distanceToolActive}
          aoiDrawingModeActive={aoiDrawingModeActive}
          enemyInfluenceLayerActive={enemyInfluenceLayerActive}
          elevationProfileActive={elevationProfileActive}
          eventBus={eventBus}
          artilleryPieces={artilleryPieces}
          forwardObservers={forwardObservers}
          activeFireMissions={activeFireMissions}
          hotspots={hotspots}
          historicalHotspots={historicalHotspots}
          osintEvents={osintEvents}
          osintLayerActive={showOsintLayer}
          piccDrawingConfig={piccDrawingConfig}
          activeTemplateContext={activeTemplateContext}
          onPiccDrawingComplete={onPiccDrawingComplete}
        />
      )}
      <div className="map-elevation-display flex items-center gap-3">
        <span className="font-mono text-[11px]">{elevationDisplay}</span>
        {weatherInfo && (
          <div className="flex items-center gap-3 border-l border-gray-600 pl-3 animate-in fade-in slide-in-from-left-2">
            <div className="flex items-center gap-1.5">
              <CloudIcon className="w-3.5 h-3.5 text-blue-400" />
              <span className="text-gray-300 font-black uppercase text-[10px] tracking-tight">{weatherInfo.condition}</span>
            </div>
            <span className="text-blue-400 font-black text-[11px]">{Math.round(weatherInfo.temperature)}°C</span>
            <span className="text-teal-400 font-bold flex items-center gap-1 text-[10px]">
              <span className="text-[10px]">💨</span> {Math.round(weatherInfo.windSpeed)}<span className="text-[8px] opacity-70">KM/H</span>
            </span>
          </div>
        )}
      </div>

      {/* Temporal Pattern Analysis - Time Slider */}
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-[1000] w-[80%] max-w-lg bg-gray-900 bg-opacity-80 border border-gray-700 p-3 rounded-xl shadow-2xl backdrop-blur-md">
        <div className="flex justify-between items-center mb-2">
          <span className="text-[10px] uppercase tracking-wider font-bold text-teal-400">Análisis Temporal (Patrones)</span>
          <span className="text-xs font-mono text-white bg-gray-800 px-2 py-0.5 rounded border border-gray-700">
            {timeOffsetHours === 0 ? 'TIEMPO REAL (AHORA)' : `HACE -${timeOffsetHours} HORAS`}
          </span>
        </div>
        <input
          type="range"
          min="0"
          max="72"
          step="1"
          value={timeOffsetHours}
          onChange={(e) => setTimeOffsetHours(parseInt(e.target.value))}
          className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-teal-500"
        />
        <div className="flex justify-between mt-1 text-[9px] text-gray-400 font-medium">
          <span>AHORA</span>
          <span>24H</span>
          <span>48H</span>
          <span>72H</span>
        </div>
      </div>

      {showWindyTacticalPanel && (
        <div className="absolute top-16 right-4 z-[1000] w-[450px] h-[500px] bg-gray-900 border border-teal-500/30 rounded-xl shadow-2xl overflow-hidden flex flex-col animate-in slide-in-from-right-5">
          <div className="bg-gray-800 border-b border-gray-700 px-3 py-2 flex items-center justify-between">
            <span className="text-xs font-bold text-teal-400 flex items-center gap-1.5">
              <span>💨</span> CLIMA TÁCTICO INTEGRADO (WINDY)
            </span>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => {
                  let lat = 4.5708;
                  let lon = -74.2973;
                  let zoom = 6;
                  if (mapRef.current) {
                    const center = mapRef.current.getCenter();
                    lat = center.lat;
                    lon = center.lng;
                    zoom = mapRef.current.getZoom();
                  }
                  setWindyCoords({ lat, lon, zoom });
                }}
                className="text-[9px] bg-teal-600/30 text-teal-300 border border-teal-500/30 px-1.5 py-0.5 rounded hover:bg-teal-500 hover:text-white transition-colors"
                title="Sincronizar el widget de Windy con la posición y zoom actuales del mapa táctico"
              >
                🔄 Sincronizar
              </button>
              <button 
                onClick={() => setShowWindyTacticalPanel(false)}
                className="text-gray-400 hover:text-white text-xs font-black p-1 hover:bg-gray-700 rounded transition-colors"
              >
                ✕
              </button>
            </div>
          </div>
          <div className="flex-1 w-full h-full relative bg-gray-950">
            <iframe 
              src={`https://embed.windy.com/embed2.html?lat=${windyCoords.lat.toFixed(4)}&lon=${windyCoords.lon.toFixed(4)}&zoom=${windyCoords.zoom}&level=surface&overlay=radar&menu=&message=true&marker=true&calendar=now&pressure=&type=map&location=coordinates&detail=&detailLat=${windyCoords.lat.toFixed(4)}&detailLon=${windyCoords.lon.toFixed(4)}&metricWind=default&metricTemp=default&radarRange=&key=TU1juayPvddctGBPMxiEXhhEnAXVnfs3`}
              width="100%"
              height="100%"
              frameBorder="0"
              title="Windy Weather Overlay"
              className="w-full h-full"
            />
          </div>
        </div>
      )}
    </div>
  );
};