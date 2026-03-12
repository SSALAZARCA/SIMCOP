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
            String url = String.format(java.util.Locale.US, "https://api.open-meteo.com/v1/forecast?latitude=%.6f&longitude=%.6f&current=temperature_2m,relative_humidity_2m,wind_speed_10m,wind_direction_10m,weather_code&wind_speed_unit=kmh&timezone=auto",
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
            String url = String.format(java.util.Locale.US, "https://elevation-api.open-meteo.com/v1/elevation?latitude=%f&longitude=%f", lat, lon);
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
            // Obtener path específico de satélite
            String satellitePath = getWeatherPath("satellite");
            if (satellitePath != null) {
                // RainViewer satellite tiles: /v2/satellite/{path}/256/{z}/{x}/{y}/0/1_1.png
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
        }

        // Usar RainViewer para la capa de precipitación (radar)
        if ("precipitation".equalsIgnoreCase(layer)) {
            String radarPath = getWeatherPath("radar");
            if (radarPath != null) {
                // RainViewer tiles: /256/{z}/{x}/{y}/...
                String url = String.format(java.util.Locale.US, "https://tilecache.rainviewer.com%s/256/%d/%d/%d/1/1_1.png", radarPath, z, x, y);
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

    public String getWeatherPath(String type) {
        try {
            @SuppressWarnings("unchecked")
            Map<String, Object> response = restTemplate
                    .getForObject("https://api.rainviewer.com/public/weather-maps.json", Map.class);
            if (response != null && response.containsKey(type)) {
                @SuppressWarnings("unchecked")
                Map<String, Object> data = (Map<String, Object>) response.get(type);
                String listKey = "satellite".equals(type) ? "infrared" : "past";
                @SuppressWarnings("unchecked")
                List<Map<String, Object>> list = (List<Map<String, Object>>) data.get(listKey);
                if (list != null && !list.isEmpty()) {
                    Object path = list.get(list.size() - 1).get("path");
                    return path != null ? path.toString() : null;
                }
            }
        } catch (Exception e) {
            System.err.println("Error fetching RainViewer paths: " + e.getMessage());
        }
        return null;
    }

    public String getReverseGeocoding(double lat, double lon) {
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
                if (parts.length >= 2) {
                    return parts[0].trim() + ", " + parts[1].trim();
                }
                return parts[0].trim();
            }
        } catch (Exception e) {
            System.err.println("Geocoding failed: " + e.getMessage());
        }
        return "Sector de Colombia (No Identificado)";
    }
}
