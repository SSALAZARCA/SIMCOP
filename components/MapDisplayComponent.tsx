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
import type { MilitaryUnit, MapDisplayProps, SelectedEntity, GeoLocation, PICCDrawingConfig, PICCElement, PICCDrawingOptions, PICCDrawingToolType, IntelligenceReport, ArtilleryPiece, ForwardObserver, FireMission, AfterActionReport, LeafletDrawEvent, SIDCGenerationOptions, Hotspot, COAPlan } from '../types';
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
import { ArrowsPointingOutIcon, ArrowsPointingInIcon, AdjustmentsHorizontalIcon } from './icons';

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
  isMaximized = false,
  onToggleMaximize
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
  const uavLayerRef = useRef<L.FeatureGroup>(L.featureGroup());
  const coaLayerRef = useRef<L.LayerGroup[]>([]);
  const [currentCOAPlan, setCurrentCOAPlan] = useState<COAPlan | null>(null);

  const piccTemplateLayersRef = useRef<Record<PlantillaType, L.FeatureGroup>>({} as Record<PlantillaType, L.FeatureGroup>);
  const layerControlRef = useRef<L.Control.Layers | null>(null);
  const weatherLayerRef = useRef<L.TileLayer | null>(null);
  const weatherMarkersLayerRef = useRef<L.LayerGroup | null>(null);

  const activeDrawControlRef = useRef<any | null>(null);
  const currentPICCDrawingToolRef = useRef<any | null>(null);
  const lastPannedIdRef = useRef<string | null>(null);

  const [distancePoints, setDistancePoints] = useState<L.LatLng[]>([]);
  const [elevationDisplay, setElevationDisplay] = useState<string>("Elevación: --- m");
  const fetchElevationTimeoutRef = useRef<number | null>(null);

  const [unitStatusFilter, setUnitStatusFilter] = useState<UnitStatus | 'ALL'>('ALL');
  const [unitTypeFilter, setUnitTypeFilter] = useState<UnitType | 'ALL'>('ALL');
  const [intelReliabilityFilter, setIntelReliabilityFilter] = useState<IntelligenceReliability | 'ALL'>('ALL');
  const [showFilters, setShowFilters] = useState<boolean>(false);
  const [showWindyWeather, setShowWindyWeather] = useState<boolean>(false);
  const [showWeatherMarkers, setShowWeatherMarkers] = useState<boolean>(false);

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
      return reliabilityMatch;
    });
  }, [intelligenceReports, intelReliabilityFilter]);


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

      osmLayer.addTo(mapInstance);

      const baseMaps = {
        "Mapa Estándar": osmLayer,
        "Imagen Satelital": satelliteLayer,
        "Topográfico": openTopoMap,
        "Transporte": transportMap,
      };
      const overlayMaps: Record<string, L.Layer> = {
        "Etiquetas de Lugares": cartoLabelsLayer,
        "Análisis de Hotspots (BMA)": hotspotsLayerRef.current,
        "Histórico Hotspots (48h)": historicalHotspotsLayerRef.current,
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

      const BACKEND_HOST = window.location.hostname;
      const BACKEND_TILE_URL = `http://${BACKEND_HOST}:8080/api/weather/tiles`;

      fetch(`http://${BACKEND_HOST}:8080/api/weather/radar-path`)
        .then(res => res.json())
        .then(data => {
          const radarPath = data.path;
          if (radarPath) {
            const newWeatherLayer = L.tileLayer(
              `https://tilecache.rainviewer.com/v2/radar/${radarPath}/512/{z}/{x}/{y}/2/1_1.png`,
              {
                attribution: 'Radar data &copy; <a href="https://www.rainviewer.com/">RainViewer</a>',
                opacity: 0.6,
                pane: 'weatherPane',
              }
            );

            if (mapInstance && layerControlRef.current) {
              layerControlRef.current.addOverlay(newWeatherLayer, "Radar Meteorológico (RainViewer)");
              weatherLayerRef.current = newWeatherLayer;
              newWeatherLayer.addTo(mapInstance); // Active by default
            }
          }
        })
        .catch(error => console.error("Error fetching weather radar path from backend:", error));

      // Capa de Precipitación
      const precipitationLayer = L.tileLayer(
        `${BACKEND_TILE_URL}/precipitation/{z}/{x}/{y}`,
        {
          attribution: 'Radar © <a href="https://openweathermap.org/">OpenWeatherMap</a>',
          opacity: 0.6,
          pane: 'weatherPane',
          maxZoom: 19
        }
      );

      // Capa de Nubes
      const cloudsLayer = L.tileLayer(
        `${BACKEND_TILE_URL}/clouds/{z}/{x}/{y}`,
        {
          attribution: 'Nubes © <a href="https://openweathermap.org/">OpenWeatherMap</a>',
          opacity: 0.5,
          pane: 'weatherPane',
          maxZoom: 19
        }
      );

      // Capa de Temperatura
      const temperatureLayer = L.tileLayer(
        `${BACKEND_TILE_URL}/temp/{z}/{x}/{y}`,
        {
          attribution: 'Temperatura © <a href="https://openweathermap.org/">OpenWeatherMap</a>',
          opacity: 0.5,
          pane: 'weatherPane',
          maxZoom: 19
        }
      );

      // Capa de Viento
      const windLayer = L.tileLayer(
        `${BACKEND_TILE_URL}/wind/{z}/{x}/{y}`,
        {
          attribution: 'Viento © <a href="https://openweathermap.org/">OpenWeatherMap</a>',
          opacity: 0.5,
          pane: 'weatherPane',
          maxZoom: 19
        }
      );

      if (layerControlRef.current) {
        layerControlRef.current.addOverlay(precipitationLayer, "🌧️ Radar Precipitación");
        layerControlRef.current.addOverlay(cloudsLayer, "☁️ Cobertura de Nubes");
        layerControlRef.current.addOverlay(temperatureLayer, "🌡️ Temperatura");
        layerControlRef.current.addOverlay(windLayer, "💨 Viento");

        // Let's add precipitation by default too
        precipitationLayer.addTo(mapInstance);
      }


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
      enemyInfluencePolygonsRef.current.addTo(mapInstance);
      hotspotsLayerRef.current.addTo(mapInstance);
      historicalHotspotsLayerRef.current.addTo(mapInstance);
      uavLayerRef.current.addTo(mapInstance);

      const colombiaBounds = L.latLngBounds(
        [MAP_BOUNDS.MIN_LAT, MAP_BOUNDS.MIN_LON],
        [MAP_BOUNDS.MAX_LAT, MAP_BOUNDS.MAX_LON]
      );
      mapInstance.fitBounds(colombiaBounds);

      const resizeObserver = new ResizeObserver(() => {
        if (mapRef.current) {
          mapRef.current.invalidateSize();
        }
      });
      if (mapContainerElement) resizeObserver.observe(mapContainerElement);

      return () => {
        if (mapContainerElement) resizeObserver.unobserve(mapContainerElement);
      }
    }
  }, []);

  // Load saved PICC graphics from database
  useEffect(() => {
    const loadSavedGraphics = async () => {
      if (!mapRef.current) return;

      try {
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
    return () => clearTimeout(timer);
  }, []);

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

  useEffect(() => {
    if (!mapRef.current) return;
    const layer = aarLayerRef.current;
    layer.clearLayers();
    const isAnyToolActive = distanceToolActive || aoiDrawingModeActive || enemyInfluenceLayerActive || piccDrawingConfig || isTargetSelectionActive || elevationProfileActive;
    afterActionReports.forEach(aar => {
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
      if (!gun) return;

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
    const handleMapClickForAoi = (e: L.LeafletMouseEvent) => { if (distanceToolActive || enemyInfluenceLayerActive || piccDrawingConfig || isTargetSelectionActive || elevationProfileActive) return; eventBus.publish('mapClickForAoi', e.latlng); };
    const clearAoiMapLayer = () => aoiLayerRef.current.clearLayers();
    const updateAoiDrawingLayer = (_msg: string, points: L.LatLng[]) => { aoiLayerRef.current.clearLayers(); points.forEach(p => L.circleMarker(p, { radius: 4, color: 'cyan', fillColor: '#0ff', fillOpacity: 0.7 }).addTo(aoiLayerRef.current)); if (points.length > 1) L.polyline(points, { color: 'cyan', weight: 2, dashArray: '3, 3' }).addTo(aoiLayerRef.current); };
    const finalizeAoiLayer = (_msg: string, geoJsonPolygon: GeoJSONFeature<GeoJSONPolygon>) => { aoiLayerRef.current.clearLayers(); if (geoJsonPolygon?.geometry?.coordinates) { const leafletCoords = (geoJsonPolygon.geometry.coordinates[0] as unknown as Position[]).map(coord => [coord[1], coord[0]] as L.LatLngTuple); L.polygon(leafletCoords, { color: 'rgba(59, 130, 246, 0.8)', fillColor: 'rgba(59, 130, 246, 0.3)', weight: 2 }).addTo(aoiLayerRef.current); } };

    const clearToken = eventBus.subscribe('clearAoiLayer', clearAoiMapLayer);
    const updateToken = eventBus.subscribe('updateAoiDrawingLayer', updateAoiDrawingLayer);
    const finalizeToken = eventBus.subscribe('finalizeAoiLayer', finalizeAoiLayer);

    if (aoiDrawingModeActive) {
      map.on('click', handleMapClickForAoi);
      map.getContainer().style.cursor = 'crosshair';
      selectionHighlightLayerRef.current.clearLayers();
      (distanceToolLayerRef.current as L.FeatureGroup).clearLayers();
      (searchResultMarkerLayerRef.current as L.FeatureGroup).clearLayers();
      enemyInfluencePolygonsRef.current.clearLayers();
      (Object.values(piccTemplateLayersRef.current) as L.FeatureGroup[]).forEach(fg => fg.clearLayers());
    }
    else { map.off('click', handleMapClickForAoi); if (!distanceToolActive && !enemyInfluenceLayerActive && !piccDrawingConfig && !isTargetSelectionActive && !elevationProfileActive) map.getContainer().style.cursor = ''; }

    return () => {
      map.off('click', handleMapClickForAoi);
      if (!distanceToolActive && !aoiDrawingModeActive && !enemyInfluenceLayerActive && !piccDrawingConfig && !isTargetSelectionActive && !elevationProfileActive) map.getContainer().style.cursor = '';
      eventBus.unsubscribe(clearToken);
      eventBus.unsubscribe(updateToken);
      eventBus.unsubscribe(finalizeToken);
    };
  }, [aoiDrawingModeActive, distanceToolActive, enemyInfluenceLayerActive, piccDrawingConfig, isTargetSelectionActive, elevationProfileActive, eventBus]);

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
      const response = await fetch(`https://api.open-elevation.com/api/v1/lookup?locations=${lat},${lon}`);
      if (!response.ok) throw new Error(`API Error: ${response.status}`);
      const data = await response.json();
      if (data.results && data.results.length > 0) setElevationDisplay(`Elevación: ${Math.round(data.results[0].elevation)} m`);
      else setElevationDisplay("Elevación: N/A");
    } catch (error) { console.warn("Error fetching elevation:", error); setElevationDisplay("Elevación: Error"); }
  }, []);

  useEffect(() => {
    const map = mapRef.current; if (!map) return;
    const throttledFetchElevation = (lat: number, lon: number) => { if (fetchElevationTimeoutRef.current) clearTimeout(fetchElevationTimeoutRef.current); fetchElevationTimeoutRef.current = window.setTimeout(() => fetchElevation(lat, lon), 300); };
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
      const popupContent = `<div class="text-sm"><strong class="text-base block text-cyan-700">${data.displayName}</strong>Tipo: ${data.placeType}<br/>Coords (GMS): ${decimalToDMS(data.location)}<br/>Lat/Lon: ${data.location.lat.toFixed(5)}, ${data.location.lon.toFixed(5)}</div>`;
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
        const threatLevel = assessThreatLevel(intel); if (threatLevel === 'Ninguno') return; const style = getThreatStyle(threatLevel);
        try {
          const center = turfPoint([intel.location.lon, intel.location.lat]); const buffered = turf.buffer(center, style.radiusKm, { units: 'kilometers' });
          if (buffered?.geometry) {
            const polygonStyle = { color: style.color, fillColor: style.fillColor, fillOpacity: style.fillOpacity, weight: style.weight };
            const popupContent = `<div class="text-xs"><strong class="block text-base text-gray-800">Área de Influencia Enemiga</strong><p><strong>Intel Fuente:</strong> ${intel.title}</p><p><strong>Nivel de Amenaza:</strong> ${threatLevel}</p><p><strong>Radio Estimado:</strong> ${style.radiusKm} km</p><p><strong>Fiabilidad:</strong> ${intel.reliability}</p><p><strong>Credibilidad:</strong> ${intel.credibility}</p></div>`;
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
      if (!distanceToolActive && !aoiDrawingModeActive && !piccDrawingConfig && !elevationProfileActive) {
        map.getContainer().style.cursor = '';
      }
    }
    return () => {
      if (map) {
        map.off('click', handleMapClickForTarget);
        if (!distanceToolActive && !aoiDrawingModeActive && !piccDrawingConfig && !isTargetSelectionActive && !elevationProfileActive) {
          map.getContainer().style.cursor = '';
        }
      }
    }
  }, [isTargetSelectionActive, onTargetSelected, distanceToolActive, aoiDrawingModeActive, piccDrawingConfig, elevationProfileActive]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const handleDrawCreated = (e: LeafletDrawEvent) => {
      const layerType = e.layerType as string;
      const layer = e.layer as L.Layer & { options: any; setStyle?: (options: L.PathOptions) => void, getLatLngs?: () => L.LatLng[] | L.LatLng[][], getLatLng?: () => L.LatLng, getCenter?: () => L.LatLng, getBounds?: () => L.LatLngBounds, bindTooltip: (content: string | HTMLElement | L.Tooltip | Function, options?: L.TooltipOptions) => L.Layer, _latlngs?: L.LatLng[] | L.LatLng[][], _latlng?: L.LatLng };

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
        } else if (labelText && layer.bindTooltip) {
          (layer as L.Path).bindTooltip(labelText, { permanent: true, direction: 'center', className: 'picc-label' }).openTooltip();
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

      // Save to database
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


    if (piccDrawingConfig && activeTemplateContext) {
      if (typeof L === 'undefined' || !(L as any).Draw || !((L as any).Draw).Polyline || !((L as any).Draw).Polygon || !((L as any).Draw).Marker) {
        console.error("Leaflet.Draw components are not available. Cannot activate PICC drawing tool.");
        if (onPiccDrawingComplete) onPiccDrawingComplete();
        return;
      }

      map.getContainer().style.cursor = 'crosshair';
      if (activeDrawControlRef.current) {
        map.removeControl(activeDrawControlRef.current);
        activeDrawControlRef.current = null;
      }
      (distanceToolLayerRef.current as L.FeatureGroup).clearLayers();
      (aoiLayerRef.current as L.FeatureGroup).clearLayers();
      (searchResultMarkerLayerRef.current as L.FeatureGroup).clearLayers();
      enemyInfluencePolygonsRef.current.clearLayers();
      selectionHighlightLayerRef.current.clearLayers();

      if (currentPICCDrawingToolRef.current) currentPICCDrawingToolRef.current.disable();

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
    } else {
      if (currentPICCDrawingToolRef.current) { currentPICCDrawingToolRef.current.disable(); currentPICCDrawingToolRef.current = null; }
      if (!distanceToolActive && !aoiDrawingModeActive && !enemyInfluenceLayerActive && !isTargetSelectionActive && !elevationProfileActive) map.getContainer().style.cursor = '';
    }

    return () => {
      map.off('draw:created', handleDrawCreated as any);
      if (currentPICCDrawingToolRef.current) {
        currentPICCDrawingToolRef.current.disable();
        currentPICCDrawingToolRef.current = null;
      }
    };
  }, [piccDrawingConfig, activeTemplateContext, onPiccDrawingComplete, distanceToolActive, aoiDrawingModeActive, enemyInfluenceLayerActive, isTargetSelectionActive, elevationProfileActive]);


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
    const layer = historicalHotspotsLayerRef.current;
    if (!layer || !mapRef.current) return;
    layer.clearLayers();

    historicalHotspots.forEach(hotspot => {
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
        <h3 className="text-md md:text-lg font-semibold text-gray-200">Mapa Operacional</h3>
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
          )}
        </div>
      </div>

      <div id="map-container" className="w-full h-full" />
      <div className="map-elevation-display">
        {elevationDisplay}
      </div>
    </div>
  );
};