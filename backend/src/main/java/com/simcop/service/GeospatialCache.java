package com.simcop.service;

import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.Map;

public class GeospatialCache {
    private static final int MAX_ENTRIES = 5000;

    private static final Map<String, String> geocodingCache = Collections.synchronizedMap(
            new LinkedHashMap<String, String>(128, 0.75f, true) {
                @Override
                protected boolean removeEldestEntry(Map.Entry<String, String> eldest) {
                    return size() > MAX_ENTRIES;
                }
            }
    );

    private static final Map<String, Double> elevationCache = Collections.synchronizedMap(
            new LinkedHashMap<String, Double>(128, 0.75f, true) {
                @Override
                protected boolean removeEldestEntry(Map.Entry<String, Double> eldest) {
                    return size() > MAX_ENTRIES;
                }
            }
    );

    private static String getCacheKey(double lat, double lon) {
        // Redondeamos a 3 decimales (aproximadamente 110 metros de resolución)
        return String.format(java.util.Locale.US, "%.3f,%.3f", lat, lon);
    }

    public static String getGeocoding(double lat, double lon) {
        return geocodingCache.get(getCacheKey(lat, lon));
    }

    public static void putGeocoding(double lat, double lon, String result) {
        if (result != null && !result.trim().isEmpty()) {
            geocodingCache.put(getCacheKey(lat, lon), result);
        }
    }

    public static Double getElevation(double lat, double lon) {
        return elevationCache.get(getCacheKey(lat, lon));
    }

    public static void putElevation(double lat, double lon, double elevation) {
        elevationCache.put(getCacheKey(lat, lon), elevation);
    }
    
    public static void clear() {
        geocodingCache.clear();
        elevationCache.clear();
    }
}
