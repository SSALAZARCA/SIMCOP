package com.simcop.controller;

import com.simcop.model.WeatherInfo;
import com.simcop.service.WeatherService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/weather")
@CrossOrigin(origins = "*")
public class WeatherController {

    @Autowired
    private WeatherService weatherService;

    @GetMapping("/current")
    public WeatherInfo getCurrentWeather(@RequestParam double lat, @RequestParam double lon) {
        return weatherService.getCurrentWeather(lat, lon);
    }

    @GetMapping("/tiles/{layer}/{z}/{x}/{y}")
    public org.springframework.http.ResponseEntity<byte[]> getWeatherTile(
            @PathVariable String layer,
            @PathVariable int z,
            @PathVariable int x,
            @PathVariable int y) {
        return weatherService.getWeatherTile(layer, z, x, y);
    }

    @GetMapping("/radar-path")
    public java.util.Map<String, String> getRadarPath() {
        String path = weatherService.getRadarPath();
        java.util.Map<String, String> res = new java.util.HashMap<>();
        res.put("path", path);
        return res;
    }
}
