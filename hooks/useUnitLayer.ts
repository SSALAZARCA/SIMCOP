
import React, { useRef, useEffect } from "react";
import L from "leaflet";
import ms from "milsymbol";
import { MilitaryUnit, SelectedEntity, MapEntityType, UnitStatus } from "../types";
import { SIDC_AFFILIATION_FRIEND, SIDC_DIMENSION_GROUND, SIDC_STATUS_PRESENT, ARTILLERY_TYPE_DETAILS } from "../constants";
import { generateUnitSIDC, getUnitFunctionIdAPP6 } from "../utils/sidcUtils";
import { decimalToDMS } from "../utils/coordinateUtils";

// Helper to check efficiently if visual representation needs update
const hasUnitChanged = (prev: MilitaryUnit | undefined, curr: MilitaryUnit, isSelected: boolean) => {
    if (!prev) return true;
    if (prev.location.lat !== curr.location.lat || prev.location.lon !== curr.location.lon) return true;
    if (prev.status !== curr.status) return true;
    if (prev.type !== curr.type) return true; // SIDC might change
    // If selection state changed for this unit, re-render
    // This is handled by passing isSelected to the render logic, but if the component using this hook
    // handles selection status separately, we might need to know.
    // Ideally, we compare derived visual props.
    return false;
};


export const useUnitLayer = (
    map: L.Map | null,
    units: MilitaryUnit[],
    selectedEntity: SelectedEntity | null,
    onSelectEntityOnMap: ((entity: SelectedEntity) => void) | undefined,
    layerRef: React.MutableRefObject<L.FeatureGroup<any> | L.MarkerClusterGroup>
) => {
    // We use a ref to track rendered markers to avoid clearing all of them
    // Key: Unit ID, Value: L.Marker
    const markersRef = useRef<Record<string, L.Marker>>({});

    useEffect(() => {
        if (!map || !layerRef.current) return;
        const layer = layerRef.current;

        // Units present in current update
        const currentUnitIds = new Set<string>();

        units.forEach(unit => {
            currentUnitIds.add(unit.id);
            const isSelected = selectedEntity?.type === MapEntityType.UNIT && selectedEntity.id === unit.id;

            // Re-generation of SIDC and Icon
            // Optimization: In a real heavy app, we would memoize the icon creation too if SIDC/Status didn't change
            // For now, we reuse the existing marker if position hasn't changed to prevent flickering

            const existingMarker = markersRef.current[unit.id];

            // Calculate new SIDC/Icon properties
            const sidc = generateUnitSIDC(unit);
            const statusColor = unit.status === UnitStatus.ENGAGED ? 'red' : (unit.status === UnitStatus.MOVING ? 'blue' : 'black');
            const symbolSize = isSelected ? 35 : 28;

            // Ideally we only re-create SVG if needed, but ms.Symbol is fast enough for hundreds, maybe not thousands.
            // Let's create the icon object:
            let customIcon: L.DivIcon;

            // Note: MILSYMBOL is global or imported. Assuming `ms` is available.
            let symbolSvg = '';
            // Checking availability of MS
            if (typeof ms !== 'undefined') {
                symbolSvg = new ms.Symbol(sidc, {
                    size: symbolSize,
                    uniqueDesignation: unit.name,
                    outlineColor: isSelected ? "gold" : "white",
                    outlineWidth: isSelected ? 4 : 2,
                    infoFields: false
                }).asSVG();
            } else {
                symbolSvg = `<svg width="${symbolSize}" height="${symbolSize}"><circle cx="${symbolSize / 2}" cy="${symbolSize / 2}" r="${symbolSize / 3}" fill="blue" stroke="white"/></svg>`;
            }

            const iconHtml = `<div class="custom-leaflet-icon-wrapper ${isSelected ? 'selected' : ''}">${symbolSvg}</div>`;
            customIcon = L.divIcon({
                html: iconHtml,
                className: '',
                iconSize: [symbolSize + 10, symbolSize + 10],
                iconAnchor: [(symbolSize + 10) / 2, (symbolSize + 10) / 2]
            });

            if (existingMarker) {
                // Update position
                const currentLatLng = existingMarker.getLatLng();
                if (currentLatLng.lat !== unit.location.lat || currentLatLng.lng !== unit.location.lon) {
                    existingMarker.setLatLng([unit.location.lat, unit.location.lon]);
                }
                // Update Icon (always update to reflect selection/SIDC changes cheaply)
                existingMarker.setIcon(customIcon);

                // Update tooltip
                const tooltipContent = `${unit.name} (${unit.type})<br/>Estado: ${unit.status}<br/>Misión: ${unit.currentMission || "N/A"}<br/>Ubic: ${decimalToDMS(unit.location)}`;
                if (existingMarker.getTooltip()?.getContent() !== tooltipContent) {
                    existingMarker.setTooltipContent(tooltipContent);
                }
                // Z-Index
                existingMarker.setZIndexOffset(isSelected ? 300 : 100);

            } else {
                // Create new marker
                const marker = L.marker([unit.location.lat, unit.location.lon], {
                    icon: customIcon,
                    zIndexOffset: isSelected ? 300 : 100
                });

                marker.bindTooltip(`${unit.name} (${unit.type})<br/>Estado: ${unit.status}<br/>Misión: ${unit.currentMission || "N/A"}<br/>Ubic: ${decimalToDMS(unit.location)}`);

                if (onSelectEntityOnMap) {
                    marker.on('click', (e) => {
                        onSelectEntityOnMap({ type: MapEntityType.UNIT, id: unit.id });
                        L.DomEvent.stopPropagation(e);
                    });
                }

                layer.addLayer(marker);
                markersRef.current[unit.id] = marker;
            }
        });

        // Cleanup removed units
        Object.keys(markersRef.current).forEach(id => {
            if (!currentUnitIds.has(id)) {
                layer.removeLayer(markersRef.current[id]);
                delete markersRef.current[id];
            }
        });

    }, [units, selectedEntity, onSelectEntityOnMap, map]); // Removed layers from dependency to avoid loop if ref changes
};
