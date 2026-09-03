package com.simcop.service;

import com.simcop.model.WeatherInfo;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import java.util.Map;
import java.util.List;

@Service
public class WeatherService {

    private static final Logger logger = LoggerFactory.getLogger(WeatherService.class);

    @org.springframework.beans.factory.annotation.Value("${app.weather.windy-api-key:${WINDY_API_KEY:}}")
    private String configuredWindyApiKey;

    private final RestTemplate restTemplate = new RestTemplate();

    private String cachedRadarPath = null;
    private String cachedSatellitePath = null;
    private long lastPathFetchTime = 0;
    private static final long PATH_CACHE_DURATION = 5 * 60 * 1000; // 5 minutos

    private static final byte[] TRANSPARENT_PNG = new byte[]{
        (byte) 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52,
        0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x08, 0x06, 0x00, 0x00, 0x00, 0x1F, 0x15, (byte) 0xC4, (byte) 0x89,
        0x00, 0x00, 0x00, 0x0A, 0x49, 0x44, 0x48, 0x52, 0x78, (byte) 0x9C, 0x63, 0x00, 0x01, 0x00, 0x00, 0x05, 0x00,
        0x01, 0x0D, 0x0A, 0x2D, (byte) 0xB4, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, 0x44, (byte) 0xAE, 0x42, 0x60,
        (byte) 0x82
    };

    private ResponseEntity<byte[]> getTransparentTile() {
        return ResponseEntity.ok()
                .header("Content-Type", "image/png")
                .header("Cache-Control", "public, max-age=86400")
                .body(TRANSPARENT_PNG);
    }

    public WeatherInfo getCurrentWeather(double lat, double lon) {
        try {
            String envKey = System.getenv("WINDY_API_KEY");
            String apiKey = (envKey != null && !envKey.trim().isEmpty()) 
                    ? envKey.trim() 
                    : (configuredWindyApiKey != null ? configuredWindyApiKey.trim() : "");
            if (apiKey.isEmpty()) {
                return getDefaultWeather();
            }

            String url = "https://api.windy.com/api/point-forecast/v2";

            org.springframework.http.HttpHeaders headers = new org.springframework.http.HttpHeaders();
            headers.setContentType(org.springframework.http.MediaType.APPLICATION_JSON);

            java.util.Map<String, Object> body = new java.util.HashMap<>();
            body.put("lat", lat);
            body.put("lon", lon);
            body.put("model", "gfs");
            body.put("parameters", java.util.Arrays.asList("temp", "wind", "rh", "clouds", "precip"));
            body.put("levels", java.util.Arrays.asList("surface"));
            body.put("key", apiKey);

            org.springframework.http.HttpEntity<java.util.Map<String, Object>> requestEntity = 
                new org.springframework.http.HttpEntity<>(body, headers);

            @SuppressWarnings("unchecked")
            Map<String, Object> response = restTemplate.postForObject(url, requestEntity, Map.class);

            if (response == null || !response.containsKey("temp-surface")) {
                return getDefaultWeather();
            }

            @SuppressWarnings("unchecked")
            List<Number> temps = (List<Number>) response.get("temp-surface");
            @SuppressWarnings("unchecked")
            List<Number> windUs = (List<Number>) response.get("wind_u-surface");
            @SuppressWarnings("unchecked")
            List<Number> windVs = (List<Number>) response.get("wind_v-surface");
            @SuppressWarnings("unchecked")
            List<Number> rhs = (List<Number>) response.get("rh-surface");
            @SuppressWarnings("unchecked")
            List<Number> clouds = (List<Number>) response.get("clouds-surface");
            @SuppressWarnings("unchecked")
            List<Number> precips = (List<Number>) response.get("precip-surface");

            if (temps == null || temps.isEmpty()) {
                return getDefaultWeather();
            }

            double temperature = temps.get(0).doubleValue();
            double u = (windUs != null && !windUs.isEmpty()) ? windUs.get(0).doubleValue() : 0.0;
            double v = (windVs != null && !windVs.isEmpty()) ? windVs.get(0).doubleValue() : 0.0;

            // Calcular velocidad del viento (de m/s a km/h)
            double windSpeedMPS = Math.sqrt(u * u + v * v);
            double windSpeed = windSpeedMPS * 3.6;

            // Rumbo meteorológico (dirección angular)
            double windDirRad = Math.atan2(v, u);
            double windDirDeg = 270.0 - Math.toDegrees(windDirRad);
            double windDirection = windDirDeg % 360.0;
            if (windDirection < 0) windDirection += 360.0;

            double humidity = (rhs != null && !rhs.isEmpty()) ? rhs.get(0).doubleValue() : 50.0;
            double cloudCover = (clouds != null && !clouds.isEmpty()) ? clouds.get(0).doubleValue() : 0.0;
            double precip = (precips != null && !precips.isEmpty()) ? precips.get(0).doubleValue() : 0.0;

            // Estimar visibilidad según lluvia y humedad
            double visibility = 10000.0;
            if (precip > 2.0) {
                visibility = 1500.0;
            } else if (precip > 0.5) {
                visibility = 4000.0;
            } else if (humidity > 95.0) {
                visibility = 2000.0;
            }

            // Estimar techo de nubes (fórmula de Espy)
            double cloudCeiling = 10000.0;
            if (cloudCover > 15.0) {
                cloudCeiling = 24.0 * (100.0 - humidity);
                if (cloudCeiling < 0.0) cloudCeiling = 0.0;
            }

            String condition = "Cielo despejado";
            if (precip > 0.5) {
                condition = "Lluvia";
            } else if (precip > 0.1) {
                condition = "Llovizna";
            } else if (cloudCover > 80.0) {
                condition = "Nublado";
            } else if (cloudCover > 30.0) {
                condition = "Parcialmente nublado";
            }

            boolean isThunderstorm = (precip > 3.0);

            // Calcular componentes U/V en km/h para compatibilidad con la interfaz
            double windRad = Math.toRadians(windDirection);
            double uComp = -windSpeed * Math.sin(windRad);
            double vComp = -windSpeed * Math.cos(windRad);

            boolean impact = calculateImpact(temperature, humidity, windSpeed, isThunderstorm, visibility, cloudCeiling);

            WeatherInfo info = new WeatherInfo(temperature, humidity, windSpeed, condition,
                    impact, isThunderstorm, windDirection, uComp, vComp, visibility, cloudCover, cloudCeiling);
            info.setWeatherCode(conditionToWmoCode(condition, isThunderstorm));
            return info;
        } catch (Exception e) {
            logger.warn("Error calling Windy Point Forecast: {}", e.getMessage());
            return getDefaultWeather();
        }
    }

    /** Maps a condition string to a representative WMO weather code for the frontend. */
    private int conditionToWmoCode(String condition, boolean isThunderstorm) {
        if (isThunderstorm || (condition != null && condition.contains("Tormenta"))) return 95;
        if (condition == null) return 0;
        if (condition.contains("Nieve")) return 71;
        if (condition.contains("Lluvia")) return 61;
        if (condition.contains("Llovizna") || condition.contains("Chubasco")) return 51;
        if (condition.contains("Niebla")) return 45;
        if (condition.contains("Nublado")) return 3;
        if (condition.contains("Parcialmente")) return 2;
        return 0; // Clear
    }

    private String decodeWeatherCode(int code) {
        if (code == 0) return "Cielo despejado";
        if (code >= 1 && code <= 3) return "Parcialmente nublado";
        if (code >= 45 && code <= 48) return "Niebla";
        if (code >= 51 && code <= 55) return "Llovizna";
        if (code >= 61 && code <= 65) return "Lluvia";
        if (code >= 71 && code <= 77) return "Nieve";
        if (code >= 80 && code <= 82) return "Chubascos";
        if (code >= 95) return "Tormenta";
        return "N/A";
    }

    private boolean calculateImpact(double temp, double humidity, double windSpeed, boolean isThunderstorm, double visibility, double cloudCeiling) {
        // Impacto operacional si: humedad extrema, vientos > 30 km/h, temperaturas extremas, tormenta, visibilidad < 3000m o techo de nubes < 150m (crítico para UAVs)
        return humidity > 85 || windSpeed > 30 || temp > 35 || temp < 0 || isThunderstorm || visibility < 3000 || cloudCeiling < 150;
    }

    private WeatherInfo getDefaultWeather() {
        return new WeatherInfo(20, 50, 10, "Información no disponible", false, false, 0, 0, 0, 10000.0, 0.0, 10000.0);
    }

    public double getElevation(double lat, double lon) {
        Double cached = GeospatialCache.getElevation(lat, lon);
        if (cached != null) {
            return cached;
        }
        try {
            String url = String.format(java.util.Locale.US, "https://elevation-api.open-meteo.com/v1/elevation?latitude=%f&longitude=%f", lat, lon);
            @SuppressWarnings("unchecked")
            Map<String, Object> response = restTemplate.getForObject(url, Map.class);
            if (response != null && response.containsKey("elevation")) {
                java.util.List<Double> elevations = (java.util.List<Double>) response.get("elevation");
                if (elevations != null && !elevations.isEmpty()) {
                    double elevation = elevations.get(0);
                    GeospatialCache.putElevation(lat, lon, elevation);
                    return elevation;
                }
            }
        } catch (Exception e) {}
        return 0;
    }

    public ResponseEntity<byte[]> getWeatherTile(String layer, int z, int x, int y) {
        if ("clouds".equalsIgnoreCase(layer)) {
            String satellitePath = getWeatherPath("satellite");
            if (satellitePath != null) {
                String url = String.format(java.util.Locale.US, "https://tilecache.rainviewer.com/v2/satellite/%s/256/%d/%d/%d/0/1_1.png", satellitePath, z, x, y);
                try {
                    byte[] image = restTemplate.getForObject(url, byte[].class);
                    if (image != null) {
                        return ResponseEntity.ok()
                                .header("Content-Type", "image/png")
                                .header("Cache-Control", "public, max-age=3600")
                                .body(image);
                    }
                } catch (Exception e) {}
            }
            return getTransparentTile();
        }

        if ("precipitation".equalsIgnoreCase(layer)) {
            String radarPath = getWeatherPath("radar");
            if (radarPath != null) {
                String url = String.format(java.util.Locale.US, "https://tilecache.rainviewer.com%s/256/%d/%d/%d/1/1_1.png", radarPath, z, x, y);
                try {
                    byte[] image = restTemplate.getForObject(url, byte[].class);
                    if (image != null) {
                        return ResponseEntity.ok()
                                .header("Content-Type", "image/png")
                                .header("Cache-Control", "public, max-age=3600")
                                .body(image);
                    }
                } catch (Exception e) {}
            }
            return getTransparentTile();
        }
        
        return ResponseEntity.notFound().build(); 
    }

    private synchronized void updateRainViewerPaths() {
        long now = System.currentTimeMillis();
        if (now - lastPathFetchTime < PATH_CACHE_DURATION && (cachedRadarPath != null || cachedSatellitePath != null)) {
            return;
        }
        try {
            @SuppressWarnings("unchecked")
            Map<String, Object> response = restTemplate
                    .getForObject("https://api.rainviewer.com/public/weather-maps.json", Map.class);
            if (response != null) {
                if (response.containsKey("radar")) {
                    @SuppressWarnings("unchecked")
                    Map<String, Object> data = (Map<String, Object>) response.get("radar");
                    @SuppressWarnings("unchecked")
                    List<Map<String, Object>> list = (List<Map<String, Object>>) data.get("past");
                    if (list != null && !list.isEmpty()) {
                        Object path = list.get(list.size() - 1).get("path");
                        if (path != null) cachedRadarPath = path.toString();
                    }
                }
                if (response.containsKey("satellite")) {
                    @SuppressWarnings("unchecked")
                    Map<String, Object> data = (Map<String, Object>) response.get("satellite");
                    @SuppressWarnings("unchecked")
                    List<Map<String, Object>> list = (List<Map<String, Object>>) data.get("infrared");
                    if (list != null && !list.isEmpty()) {
                        Object path = list.get(list.size() - 1).get("path");
                        if (path != null) cachedSatellitePath = path.toString();
                    }
                }
                lastPathFetchTime = now;
            }
        } catch (Exception e) {
            logger.warn("Error fetching RainViewer paths: {}", e.getMessage());
        }
    }

    public String getWeatherPath(String type) {
        updateRainViewerPaths();
        if ("satellite".equals(type)) {
            return cachedSatellitePath;
        }
        return cachedRadarPath;
    }

    public String getReverseGeocoding(double lat, double lon) {
        String cached = GeospatialCache.getGeocoding(lat, lon);
        if (cached != null) {
            return cached;
        }
        try {
            // Usar Nominatim (OpenStreetMap) para geocodificación inversa
            String url = String.format(java.util.Locale.US, "https://nominatim.openstreetmap.org/reverse?lat=%f&lon=%f&format=json&accept-language=es&zoom=10", lat, lon);
            
            org.springframework.http.HttpHeaders headers = new org.springframework.http.HttpHeaders();
            headers.set("User-Agent", "SIMCOP-Tactical-App/1.0");
            org.springframework.http.HttpEntity<String> entity = new org.springframework.http.HttpEntity<>(headers);
            
            org.springframework.http.ResponseEntity<java.util.Map> response = restTemplate.exchange(url, org.springframework.http.HttpMethod.GET, entity, java.util.Map.class);
            
            java.util.Map body = response != null ? response.getBody() : null;
            if (body != null && body.containsKey("display_name")) {
                String fullName = (String) body.get("display_name");
                String[] parts = fullName.split(",");
                String result = "Sector de Colombia (No Identificado)";
                if (parts.length >= 2) {
                    result = parts[0].trim() + ", " + parts[1].trim();
                } else {
                    result = parts[0].trim();
                }
                GeospatialCache.putGeocoding(lat, lon, result);
                return result;
            }
        } catch (Exception e) {
            logger.warn("Geocoding failed: {}", e.getMessage());
        }
        return "Sector de Colombia (No Identificado)";
    }
}
