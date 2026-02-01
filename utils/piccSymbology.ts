import L from 'leaflet';
import ms from 'milsymbol';
import { PICCElementType } from '../types';

/**
 * Configuración de símbolos centrales para áreas tácticas
 */
const AREA_CENTER_SYMBOLS: Record<string, { sidc: string; size: number }> = {
    [PICCElementType.FRIENDLY_OBJECTIVE]: { sidc: 'GFGPGPO---', size: 35 },
    [PICCElementType.FRIENDLY_ASSEMBLY_AREA]: { sidc: 'GFGPGPA---', size: 30 },
    [PICCElementType.OBSTACLE_MINEFIELD_PLANNED]: { sidc: 'GFMOMF----', size: 30 },
    [PICCElementType.OBSTACLE_MINEFIELD_DETECTED]: { sidc: 'GHMOMF----', size: 30 },
    [PICCElementType.NFA_AREA]: { sidc: 'GFFPNF----', size: 25 },
    [PICCElementType.RFA_AREA]: { sidc: 'GFFPRF----', size: 25 },
};

/**
 * Patrones SVG para relleno de áreas especiales
 */
export const SVG_PATTERNS = {
    minefield: `
    <pattern id="minefield-pattern" width="30" height="30" patternUnits="userSpaceOnUse">
      <circle cx="15" cy="15" r="2" fill="currentColor" opacity="0.6"/>
      <line x1="10" y1="15" x2="20" y2="15" stroke="currentColor" stroke-width="1" opacity="0.4"/>
      <line x1="15" y1="10" x2="15" y2="20" stroke="currentColor" stroke-width="1" opacity="0.4"/>
    </pattern>
  `,
    obstacle: `
    <pattern id="obstacle-pattern" width="20" height="20" patternUnits="userSpaceOnUse">
      <path d="M0,0 L20,20 M20,0 L0,20" stroke="currentColor" stroke-width="1" opacity="0.3"/>
    </pattern>
  `,
    restrictedFire: `
    <pattern id="restricted-fire-pattern" width="40" height="40" patternUnits="userSpaceOnUse">
      <circle cx="20" cy="20" r="8" fill="none" stroke="currentColor" stroke-width="2" opacity="0.3"/>
      <line x1="20" y1="12" x2="20" y2="28" stroke="currentColor" stroke-width="2" opacity="0.3"/>
    </pattern>
  `,
};

/**
 * Agrega un símbolo militar en el centro de un polígono
 */
export function addCenterSymbolToArea(
    polygon: L.Polygon,
    elementType: PICCElementType,
    targetLayer: L.FeatureGroup
): L.Marker | null {
    const symbolConfig = AREA_CENTER_SYMBOLS[elementType];

    if (!symbolConfig) {
        return null; // No hay símbolo central definido para este tipo
    }

    try {
        // Calcular el centro del polígono
        const bounds = polygon.getBounds();
        const center = bounds.getCenter();

        // Generar el símbolo militar
        if (typeof ms === 'undefined' || !ms || typeof ms.Symbol !== 'function') {
            console.warn('Milsymbol no disponible para símbolo central');
            return null;
        }

        const symbol = new ms.Symbol(symbolConfig.sidc, {
            size: symbolConfig.size,
            outlineColor: 'black',
            outlineWidth: 2,
            infoFields: false,
            standard: '2525',
        });

        const symbolSvg = symbol.asSVG();

        // Crear marcador con el símbolo
        const icon = L.divIcon({
            html: symbolSvg,
            className: 'picc-area-center-symbol',
            iconSize: [symbolConfig.size, symbolConfig.size],
            iconAnchor: [symbolConfig.size / 2, symbolConfig.size / 2],
        });

        const marker = L.marker(center, { icon });

        // Agregar a la capa
        targetLayer.addLayer(marker);

        return marker;
    } catch (error) {
        console.error('Error creando símbolo central:', error);
        return null;
    }
}

/**
 * Aplica un patrón de relleno SVG a un polígono
 */
export function applyFillPattern(
    polygon: L.Polygon,
    elementType: PICCElementType
): void {
    let patternId: string | null = null;
    let patternColor: string = '#000000';

    switch (elementType) {
        case PICCElementType.OBSTACLE_MINEFIELD_PLANNED:
            patternId = 'minefield-pattern';
            patternColor = '#0000FF'; // Azul para amigo
            break;
        case PICCElementType.OBSTACLE_MINEFIELD_DETECTED:
            patternId = 'minefield-pattern';
            patternColor = '#FF0000'; // Rojo para enemigo
            break;
        case PICCElementType.OBSTACLE_BARRIER_GENERIC:
            patternId = 'obstacle-pattern';
            patternColor = '#FFA500'; // Naranja
            break;
        case PICCElementType.RFA_AREA:
            patternId = 'restricted-fire-pattern';
            patternColor = '#FFC0CB'; // Rosa
            break;
    }

    if (patternId) {
        // Inyectar el patrón SVG en el DOM si no existe
        injectSVGPattern(patternId, patternColor);

        // Aplicar el patrón al polígono
        const pathElement = (polygon as any)._path;
        if (pathElement) {
            pathElement.style.fill = `url(#${patternId})`;
        }
    }
}

/**
 * Inyecta patrones SVG en el DOM
 */
function injectSVGPattern(patternId: string, color: string): void {
    // Verificar si ya existe
    if (document.getElementById(patternId)) {
        return;
    }

    // Crear elemento SVG con el patrón
    let svgDefs = document.getElementById('picc-svg-patterns') as unknown as SVGDefsElement | null;

    if (!svgDefs) {
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('width', '0');
        svg.setAttribute('height', '0');
        svg.style.position = 'absolute';

        svgDefs = document.createElementNS('http://www.w3.org/2000/svg', 'defs') as SVGDefsElement;
        svgDefs.id = 'picc-svg-patterns';
        svg.appendChild(svgDefs);
        document.body.appendChild(svg);
    }

    // Agregar el patrón
    const patternSVG = SVG_PATTERNS[patternId.replace('-pattern', '') as keyof typeof SVG_PATTERNS];
    if (patternSVG) {
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = patternSVG.replace(/currentColor/g, color);
        const patternElement = tempDiv.firstElementChild as SVGElement | null; // Cast to SVGElement
        if (patternElement) {
            svgDefs.appendChild(patternElement);
        }
    }
}

/**
 * Mejora un eje de ataque con flechas intermedias
 */
export function enhanceAttackAxis(
    polyline: L.Polyline,
    elementType: PICCElementType,
    targetLayer: L.FeatureGroup,
    color: string = '#0000FF'
): void {
    if (typeof L === 'undefined' || !(L as any).polylineDecorator) {
        console.warn('Leaflet.PolylineDecorator no disponible');
        return;
    }

    try {
        const isMainAxis = elementType === PICCElementType.FRIENDLY_MAIN_ATTACK_AXIS;
        const arrowSize = isMainAxis ? 18 : 14;
        const arrowSpacing = isMainAxis ? '150m' : '200m';

        // Crear decorador con flechas intermedias y final
        const decorator = (L as any).polylineDecorator(polyline, {
            patterns: [
                // Flechas intermedias
                {
                    offset: '25%',
                    repeat: arrowSpacing,
                    symbol: (L as any).Symbol.arrowHead({
                        pixelSize: arrowSize - 3,
                        pathOptions: {
                            color: color,
                            fillOpacity: 0.8,
                            weight: 0,
                        },
                    }),
                },
                // Flecha final (más grande)
                {
                    offset: '100%',
                    repeat: 0,
                    symbol: (L as any).Symbol.arrowHead({
                        pixelSize: arrowSize + 5,
                        pathOptions: {
                            color: color,
                            fillOpacity: 1,
                            weight: 0,
                        },
                    }),
                },
            ],
        });

        targetLayer.addLayer(decorator);
    } catch (error) {
        console.error('Error mejorando eje de ataque:', error);
    }
}
