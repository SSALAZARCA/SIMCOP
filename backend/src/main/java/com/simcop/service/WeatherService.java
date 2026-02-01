package com.simcop.service;

import com.simcop.model.WeatherInfo;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import java.util.Map;
import java.util.List;

@Service
public class WeatherService {

    @Value("${openweather.api.key}")
    private String apiKey;

    @Value("${openweather.api.url}")
    private String apiUrl;

    private final RestTemplate restTemplate = new RestTemplate();

    public WeatherInfo getCurrentWeather(double lat, double lon) {
        try {
            String url = String.format("%s?lat=%f&lon=%f&appid=%s&units=metric&lang=es",
                    apiUrl, lat, lon, apiKey);

            @SuppressWarnings("unchecked")
            Map<String, Object> response = restTemplate.getForObject(url, Map.class);

            if (response == null)
                return getDefaultWeather();

            @SuppressWarnings("unchecked")
            Map<String, Object> main = (Map<String, Object>) response.get("main");
            @SuppressWarnings("unchecked")
            Map<String, Object> wind = (Map<String, Object>) response.get("wind");
            @SuppressWarnings("unchecked")
            List<Map<String, Object>> weatherList = (List<Map<String, Object>>) response.get("weather");

            double temperature = ((Number) main.get("temp")).doubleValue();
            double humidity = ((Number) main.get("humidity")).doubleValue();
            double windSpeed = ((Number) wind.get("speed")).doubleValue() * 3.6; // m/s to km/h

            String condition = "Despejado";
            if (weatherList != null && !weatherList.isEmpty()) {
                condition = (String) weatherList.get(0).get("description");
            }
            condition = condition.substring(0, 1).toUpperCase() + condition.substring(1);

            return new WeatherInfo(temperature, humidity, windSpeed, condition,
                    calculateImpact(temperature, humidity, windSpeed));
        } catch (Exception e) {
            return getDefaultWeather();
        }
    }

    private boolean calculateImpact(double temp, double humidity, double windSpeed) {
        return humidity > 85 || windSpeed > 30 || temp > 35 || temp < 0;
    }

    private WeatherInfo getDefaultWeather() {
        return new WeatherInfo(20, 50, 10, "Información no disponible", false);
    }

    public ResponseEntity<byte[]> getWeatherTile(String layer, int z, int x, int y) {
        try {
            String owmLayer = layer;
            if (layer.equals("precipitation"))
                owmLayer = "precipitation_new";
            else if (layer.equals("clouds"))
                owmLayer = "clouds_new";
            else if (layer.equals("temp"))
                owmLayer = "temp_new";
            else if (layer.equals("wind"))
                owmLayer = "wind_new";

            String url = String.format("https://tile.openweathermap.org/map/%s/%d/%d/%d.png?appid=%s",
                    owmLayer, z, x, y, apiKey);

            byte[] image = restTemplate.getForObject(url, byte[].class);
            return ResponseEntity.ok().contentType(MediaType.IMAGE_PNG).body(image);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
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
        } catch (Exception e) {
        }
        return null;
    }
}
