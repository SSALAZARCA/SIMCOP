import * as L from 'leaflet';

declare module 'leaflet' {
    class MarkerClusterGroup extends FeatureGroup {
        constructor(options?: any);
        addLayer(layer: Layer): this;
        addLayers(layers: Layer[]): this;
        removeLayer(layer: Layer): this;
        clearLayers(): this;
        getBounds(): LatLngBounds;
    }
}
