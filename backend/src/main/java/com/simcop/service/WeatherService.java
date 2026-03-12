package com.simcop.service;

import com.simcop.model.WeatherInfo;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import java.util.Map;
import java.util.List;

@Service
public class WeatherService {

    private final RestTemplate restTemplate = new RestTemplate();

    public WeatherInfo getCurrentWeather(double lat, double lon) {
        try {
            // Open-Meteo con dirección de viento para Fase 2
            String url = String.format("https://api.open-meteo.com/v1/forecast?latitude=%.6f&longitude=%.6f&current=temperature_2m,relative_humidity_2m,wind_speed_10m,wind_direction_10m,weather_code&wind_speed_unit=kmh&timezone=auto",
                    lat, lon);

            @SuppressWarnings("unchecked")
            Map<String, Object> response = restTemplate.getForObject(url, Map.class);

            if (response == null || !response.containsKey("current"))
                return getDefaultWeather();

            @SuppressWarnings("unchecked")
            Map<String, Object> current = (Map<String, Object>) response.get("current");

            double temperature = ((Number) current.get("temperature_2m")).doubleValue();
            double humidity = ((Number) current.get("relative_humidity_2m")).doubleValue();
            double windSpeed = ((Number) current.get("wind_speed_10m")).doubleValue();
            int windDirection = ((Number) current.get("wind_direction_10m")).intValue();
            int weatherCode = ((Number) current.get("weather_code")).intValue();

            String condition = decodeWeatherCode(weatherCode);
            boolean isThunderstorm = (weatherCode >= 95);

            // Añadir metadatos adicionales si es necesario (U/V componentes)
            double windRad = Math.toRadians(windDirection);
            double u = -windSpeed * Math.sin(windRad); // Componente Este-Oeste
            double v = -windSpeed * Math.cos(windRad); // Componente Norte-Sur

            return new WeatherInfo(temperature, humidity, windSpeed, condition,
                    calculateImpact(temperature, humidity, windSpeed, isThunderstorm), 
                    isThunderstorm, windDirection, u, v);
        } catch (Exception e) {
            return getDefaultWeather();
        }
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

    private boolean calculateImpact(double temp, double humidity, double windSpeed, boolean isThunderstorm) {
        return humidity > 85 || windSpeed > 30 || temp > 35 || temp < 0 || isThunderstorm;
    }

    private WeatherInfo getDefaultWeather() {
        return new WeatherInfo(20, 50, 10, "Información no disponible", false, false, 0, 0, 0);
    }

    public double getElevation(double lat, double lon) {
        try {
            String url = String.format("https://elevation-api.open-meteo.com/v1/elevation?latitude=%f&longitude=%f", lat, lon);
            @SuppressWarnings("unchecked")
            Map<String, Object> response = restTemplate.getForObject(url, Map.class);
            if (response != null && response.containsKey("elevation")) {
                java.util.List<Double> elevations = (java.util.List<Double>) response.get("elevation");
                if (elevations != null && !elevations.isEmpty()) {
                    return elevations.get(0);
                }
            }
        } catch (Exception e) {}
        return 0;
    }

    public ResponseEntity<byte[]> getWeatherTile(String layer, int z, int x, int y) {
        // Usar NASA GIBS para nubes/satélite (Capa profesional y gratuita)
        if ("clouds".equalsIgnoreCase(layer)) {
            // Layer: MODIS_Terra_CorrectedReflectance_TrueColor (Satélite + Nubes en tiempo real)
            // MatrixSet: 250m (Soporta zoom alto)
            String url = String.format("https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/MODIS_Terra_CorrectedReflectance_TrueColor/default/default/250m/%d/%d/%d.jpg", z, y, x);
            try {
                byte[] image = restTemplate.getForObject(url, byte[].class);
                if (image != null) {
                    return ResponseEntity.ok()
                            .header("Content-Type", "image/jpeg")
                            .header("Cache-Control", "public, max-age=3600")
                            .body(image);
                }
            } catch (Exception e) {}
        }

        // Usar RainViewer para la capa de precipitación (radar)
        if ("precipitation".equalsIgnoreCase(layer)) {
            String radarPath = getRadarPath();
            if (radarPath != null) {
                // RainViewer tiles: /256/{z}/{x}/{y}/...
                String url = String.format("https://tilecache.rainviewer.com%s/256/%d/%d/%d/1/1_1.png", radarPath, z, x, y);
                try {
                    byte[] image = restTemplate.getForObject(url, byte[].class);
                    if (image != null) {
                        return ResponseEntity.ok()
                                .header("Content-Type", "image/png")
                                .body(image);
                    }
                } catch (Exception e) {
                    // Fallback para evitar errores 404 de zoom no soportado en RainViewer
                }
            }
        }
        
        return ResponseEntity.notFound().build(); 
    }

    public String getRadarPath() {
        try {
            @SuppressWarnings("unchecked")
            Map<String, Object> response = restTemplate
                    .getForObject("https://api.rainviewer.com/public/weather-maps.json", Map.class);
            if (response != null && response.containsKey("radar")) {
                @SuppressWarnings("unchecked")
                Map<String, Object> radar = (Map<String, Object>) response.get("radar");
                @SuppressWarnings("unchecked")
                List<Map<String, Object>> past = (List<Map<String, Object>>) radar.get("past");
                if (past != null && !past.isEmpty()) {
                    return (String) past.get(past.size() - 1).get("path");
                }
            }
        } catch (Exception e) {}
        return null;
    }
}
