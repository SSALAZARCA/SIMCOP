import L from 'leaflet';
import ms from 'milsymbol';
import { OperationalGraphic, PICCElementType, PlantillaType } from '../types';
import { getPICCElementSIDC } from './sidcUtils';
import { DEFAULT_PICC_SYMBOL_SIZE, PICC_PATH_OPTIONS_CONTROL, PICC_PATH_OPTIONS_NEUTRAL } from '../constants';

/**
 * Convierte un OperationalGraphic guardado en la BD a un Layer de Leaflet
 */
export function operationalGraphicToLayer(
    graphic: OperationalGraphic,
    piccSymbolSize: number = DEFAULT_PICC_SYMBOL_SIZE
): L.Layer | null {
    try {
        const geoJson = JSON.parse(graphic.geoJson);
        const graphicType = graphic.graphicType as PICCElementType;

        // Determinar si es un símbolo de punto
        const isPointSymbol = [
            PICCElementType.ENEMY_UNIT_POINT_SIT,
            PICCElementType.FRIENDLY_UNIT_POINT_SIT,
            PICCElementType.NEUTRAL_POINT_SIT,
            PICCElementType.CIVILIAN_POINT_SIT,
            PICCElementType.NAI_POINT,
            PICCElementType.TARGET_REFERENCE_POINT,
            PICCElementType.CONTROL_CHECKPOINT,
            PICCElementType.OBSTACLE_DEMOLITION_PLANNED
        ].includes(graphicType);

        if (isPointSymbol && geoJson.geometry.type === 'Point') {
            // Crear marcador con símbolo militar
            const coords = geoJson.geometry.coordinates;
            const latLng = L.latLng(coords[1], coords[0]);

            // Generar SIDC desde el tipo
            const sidc = getPICCElementSIDC(graphicType);

            let symbolSvg = '';
            if (typeof ms !== 'undefined' && ms && typeof ms.Symbol === 'function') {
                try {
                    symbolSvg = new ms.Symbol(sidc, {
                        size: piccSymbolSize,
                        outlineColor: 'black',
                        outlineWidth: 1,
                        infoFields: false,
                        standard: '2525'
                    }).asSVG();
                } catch (err) {
                    console.error('Error creating symbol:', err);
                    symbolSvg = `<svg width="${piccSymbolSize}" height="${piccSymbolSize}"><rect fill="red" width="${piccSymbolSize}" height="${piccSymbolSize}"/></svg>`;
                }
            }

            const icon = L.divIcon({
                html: symbolSvg,
                className: 'custom-leaflet-icon-wrapper',
                iconSize: [piccSymbolSize, piccSymbolSize],
                iconAnchor: [piccSymbolSize / 2, piccSymbolSize / 2]
            });

            const marker = L.marker(latLng, { icon });

            if (graphic.label) {
                marker.bindTooltip(graphic.label, {
                    permanent: true,
                    direction: 'top',
                    offset: L.point(0, -(piccSymbolSize / 2) - 2),
                    className: 'picc-label'
                });
            }

            // Guardar metadata
            (marker as any).options.piccId = graphic.id;
            (marker as any).options.piccType = graphicType;
            (marker as any).options.activeTemplateContext = graphic.plantillaType;

            return marker;
        } else {
            // Crear polyline o polygon
            const layer = L.geoJSON(geoJson, {
                style: (feature) => {
                    // Aplicar estilo según el tipo
                    if (graphicType === PICCElementType.CONTROL_PHASE_LINE) {
                        return PICC_PATH_OPTIONS_CONTROL;
                    }
                    return geoJson.properties?.style || PICC_PATH_OPTIONS_NEUTRAL;
                }
            });

            const leafletLayer = layer.getLayers()[0] as L.Path;

            if (graphic.label && leafletLayer.bindTooltip) {
                leafletLayer.bindTooltip(graphic.label, {
                    permanent: true,
                    direction: 'center',
                    className: 'picc-label'
                });
            }

            // Guardar metadata
            (leafletLayer as any).options.piccId = graphic.id;
            (leafletLayer as any).options.piccType = graphicType;
            (leafletLayer as any).options.activeTemplateContext = graphic.plantillaType;

            return leafletLayer;
        }
    } catch (error) {
        console.error('Error converting OperationalGraphic to layer:', error, graphic);
        return null;
    }
}

/**
 * Convierte un Layer de Leaflet a OperationalGraphic para guardar en BD
 */
export function layerToOperationalGraphic(
    layer: L.Layer,
    plantillaType: PlantillaType,
    graphicType: PICCElementType,
    label?: string,
    userId?: string
): OperationalGraphic | null {
    try {
        let geoJson: any;

        // Convertir a GeoJSON
        if ((layer as any).toGeoJSON) {
            geoJson = (layer as any).toGeoJSON();
        } else if ((layer as L.Marker).getLatLng) {
            // Es un marcador
            const latLng = (layer as L.Marker).getLatLng();
            geoJson = {
                type: 'Feature',
                geometry: {
                    type: 'Point',
                    coordinates: [latLng.lng, latLng.lat]
                },
                properties: {}
            };
        } else {
            console.error('Layer cannot be converted to GeoJSON');
            return null;
        }

        // Guardar estilo en properties si es Path
        if ((layer as L.Path).options) {
            geoJson.properties = geoJson.properties || {};
            geoJson.properties.style = {
                color: (layer as L.Path).options.color,
                weight: (layer as L.Path).options.weight,
                fillColor: (layer as L.Path).options.fillColor,
                fillOpacity: (layer as L.Path).options.fillOpacity,
                dashArray: (layer as L.Path).options.dashArray
            };
        }

        return {
            plantillaType: plantillaType,
            graphicType: graphicType,
            geoJson: JSON.stringify(geoJson),
            label: label,
            createdByUserId: userId
        };
    } catch (error) {
        console.error('Error converting layer to OperationalGraphic:', error);
        return null;
    }
}
