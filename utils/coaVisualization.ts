import L from 'leaflet';
import { COAPlan, COAGraphicElement, COAGraphicType, PICCElementType } from '../types';
import { PICC_PATH_OPTIONS_FRIENDLY, PICC_PATH_OPTIONS_CONTROL } from '../constants';

/**
 * Mapeo de tipos de gráficos COA a tipos PICC existentes
 */
const COA_TO_PICC_TYPE_MAPPING: Record<COAGraphicType, PICCElementType> = {
    [COAGraphicType.PHASE_LINE]: PICCElementType.CONTROL_PHASE_LINE,
    [COAGraphicType.AXIS_OF_ADVANCE]: PICCElementType.FRIENDLY_MAIN_ATTACK_AXIS,
    [COAGraphicType.OBJECTIVE]: PICCElementType.FRIENDLY_OBJECTIVE,
    [COAGraphicType.ASSEMBLY_AREA]: PICCElementType.FRIENDLY_ASSEMBLY_AREA,
};

/**
 * Colores por fase para diferenciar visualmente
 */
const PHASE_COLORS = [
    '#3B82F6', // Azul - Fase 1
    '#10B981', // Verde - Fase 2
    '#F59E0B', // Naranja - Fase 3
    '#8B5CF6', // Púrpura - Fase 4
    '#EC4899', // Rosa - Fase 5
];

/**
 * Convierte un elemento gráfico COA a una capa de Leaflet
 */
export function coaGraphicToLayer(
    graphic: COAGraphicElement,
    phaseIndex: number,
    planName: string
): L.Layer | null {
    if (!graphic.locations || graphic.locations.length === 0) {
        console.warn('COA graphic sin ubicaciones:', graphic);
        return null;
    }

    const phaseColor = PHASE_COLORS[phaseIndex % PHASE_COLORS.length];
    
    // Filtramos locACIONES nulas antes de mapear
    const validLocations = graphic.locations.filter(loc => loc && loc.lat != null && loc.lon != null);
    if (validLocations.length === 0) return null;
    
    const latlngs = validLocations.map(loc => L.latLng(loc.lat, loc.lon));

    try {
        let layer: L.Layer;

        switch (graphic.type) {
            case COAGraphicType.PHASE_LINE:
                // Línea de fase - requiere al menos 2 puntos
                if (latlngs.length < 2) {
                    console.warn('Línea de fase requiere al menos 2 puntos');
                    return null;
                }
                layer = L.polyline(latlngs, {
                    ...PICC_PATH_OPTIONS_CONTROL,
                    color: phaseColor,
                    weight: 3,
                    dashArray: '10, 5',
                });

                // Agregar etiquetas en los extremos
                const startMarker = L.marker(latlngs[0], {
                    icon: L.divIcon({
                        className: 'coa-phase-line-label',
                        html: `<div style="background: ${phaseColor}; color: white; padding: 2px 6px; border-radius: 3px; font-weight: bold; font-size: 11px; white-space: nowrap;">${graphic.label}</div>`,
                        iconAnchor: [0, -10],
                    }),
                });
                const endMarker = L.marker(latlngs[latlngs.length - 1], {
                    icon: L.divIcon({
                        className: 'coa-phase-line-label',
                        html: `<div style="background: ${phaseColor}; color: white; padding: 2px 6px; border-radius: 3px; font-weight: bold; font-size: 11px; white-space: nowrap;">${graphic.label}</div>`,
                        iconAnchor: [0, -10],
                    }),
                });

                const layerGroup = L.layerGroup([layer, startMarker, endMarker]);
                (layerGroup as any).coaMetadata = { graphic, phaseIndex, planName };
                return layerGroup;

            case COAGraphicType.AXIS_OF_ADVANCE:
                // Eje de avance - requiere al menos 2 puntos
                if (latlngs.length < 2) {
                    console.warn('Eje de avance requiere al menos 2 puntos');
                    return null;
                }
                layer = L.polyline(latlngs, {
                    ...PICC_PATH_OPTIONS_FRIENDLY,
                    color: phaseColor,
                    weight: 4,
                });

                // Agregar flecha al final
                if (typeof L !== 'undefined' && (L as any).polylineDecorator) {
                    try {
                        const decorator = (L as any).polylineDecorator(layer, {
                            patterns: [
                                {
                                    offset: '100%',
                                    repeat: 0,
                                    symbol: (L as any).Symbol.arrowHead({
                                        pixelSize: 20,
                                        pathOptions: {
                                            color: phaseColor,
                                            fillOpacity: 1,
                                            weight: 0,
                                        },
                                    }),
                                },
                            ],
                        });

                        const axisGroup = L.layerGroup([layer, decorator]);
                        (axisGroup as any).coaMetadata = { graphic, phaseIndex, planName };

                        // Tooltip con label
                        (layer as L.Polyline).bindTooltip(graphic.label, {
                            permanent: true,
                            direction: 'center',
                            className: 'coa-axis-label',
                        });

                        return axisGroup;
                    } catch (err) {
                        console.error('Error creando decorador para eje:', err);
                    }
                }

                (layer as any).coaMetadata = { graphic, phaseIndex, planName };
                (layer as L.Polyline).bindTooltip(graphic.label, {
                    permanent: true,
                    direction: 'center',
                });
                return layer;

            case COAGraphicType.OBJECTIVE:
                // Objetivo - puede ser punto o área
                if (latlngs.length === 1) {
                    // Objetivo puntual - crear círculo
                    layer = L.circle(latlngs[0], {
                        ...PICC_PATH_OPTIONS_FRIENDLY,
                        color: phaseColor,
                        fillColor: phaseColor,
                        fillOpacity: 0.3,
                        radius: 500, // 500m de radio
                    });
                } else {
                    // Objetivo de área - polígono
                    layer = L.polygon(latlngs, {
                        ...PICC_PATH_OPTIONS_FRIENDLY,
                        color: phaseColor,
                        fillColor: phaseColor,
                        fillOpacity: 0.2,
                    });
                }

                (layer as any).coaMetadata = { graphic, phaseIndex, planName };
                (layer as L.Path).bindTooltip(`OBJ ${graphic.label}`, {
                    permanent: true,
                    direction: 'center',
                    className: 'coa-objective-label',
                });
                return layer;

            case COAGraphicType.ASSEMBLY_AREA:
                // Área de reunión - polígono
                if (latlngs.length < 3) {
                    console.warn('Área de reunión requiere al menos 3 puntos');
                    return null;
                }
                layer = L.polygon(latlngs, {
                    ...PICC_PATH_OPTIONS_FRIENDLY,
                    color: phaseColor,
                    fillColor: phaseColor,
                    fillOpacity: 0.15,
                    dashArray: '5, 5',
                });

                (layer as any).coaMetadata = { graphic, phaseIndex, planName };
                (layer as L.Polygon).bindTooltip(`AR ${graphic.label}`, {
                    permanent: true,
                    direction: 'center',
                    className: 'coa-assembly-label',
                });
                return layer;

            default:
                console.warn('Tipo de gráfico COA desconocido:', graphic.type);
                return null;
        }
    } catch (error) {
        console.error('Error creando capa COA:', error);
        return null;
    }
}

/**
 * Convierte un plan COA completo a un array de capas agrupadas por fase
 */
export function coaPlanToLayers(plan: COAPlan): L.LayerGroup[] {
    const phaseLayers: L.LayerGroup[] = [];

    plan.phases.forEach((phase, phaseIndex) => {
        const phaseGroup = L.layerGroup();
        (phaseGroup as any).coaPhaseMetadata = {
            phaseName: phase.phaseName,
            phaseIndex,
            planName: plan.planName,
        };

        phase.graphics.forEach(graphic => {
            const layer = coaGraphicToLayer(graphic, phaseIndex, plan.planName);
            if (layer) {
                phaseGroup.addLayer(layer);
            }
        });

        phaseLayers.push(phaseGroup);
    });

    return phaseLayers;
}

/**
 * Crea un control de capas para las fases del COA
 */
export function createCOAPhaseControl(
    phaseLayers: L.LayerGroup[],
    plan: COAPlan
): { [key: string]: L.LayerGroup } {
    const overlays: { [key: string]: L.LayerGroup } = {};

    phaseLayers.forEach((layerGroup, index) => {
        const phaseName = plan.phases[index]?.phaseName || `Fase ${index + 1}`;
        overlays[`📍 ${phaseName}`] = layerGroup;
    });

    return overlays;
}

/**
 * Calcula los límites (bounds) de un plan COA para hacer zoom
 */
export function getCOAPlanBounds(plan: COAPlan): L.LatLngBounds | null {
    const allPoints: L.LatLng[] = [];

    plan.phases.forEach(phase => {
        phase.graphics.forEach(graphic => {
            if (graphic && graphic.locations) {
                graphic.locations.forEach(loc => {
                    if (loc && loc.lat != null && loc.lon != null) {
                        allPoints.push(L.latLng(loc.lat, loc.lon));
                    }
                });
            }
        });
    });

    if (allPoints.length === 0) return null;

    return L.latLngBounds(allPoints);
}
