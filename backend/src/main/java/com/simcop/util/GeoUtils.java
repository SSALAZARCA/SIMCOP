package com.simcop.util;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.simcop.model.embeddable.GeoLocation;
import org.springframework.lang.NonNull;

public class GeoUtils {

    private static final double EARTH_RADIUS_KM = 6371.0;
    private static final double EARTH_RADIUS_METERS = 6371000.0;

    private static final ObjectMapper objectMapper = new ObjectMapper();

    /**
     * Calculates the distance between two points in meters using the Haversine
     * formula.
     */
    public static double calculateDistanceMeters(GeoLocation loc1, GeoLocation loc2) {
        if (loc1 == null || loc2 == null) {
            return Double.MAX_VALUE;
        }

        double lat1 = Math.toRadians(loc1.getLat());
        double lon1 = Math.toRadians(loc1.getLon());
        double lat2 = Math.toRadians(loc2.getLat());
        double lon2 = Math.toRadians(loc2.getLon());

        double dLat = lat2 - lat1;
        double dLon = lon2 - lon1;

        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                Math.cos(lat1) * Math.cos(lat2) *
                        Math.sin(dLon / 2) * Math.sin(dLon / 2);

        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

        return EARTH_RADIUS_METERS * c;
    }

    /**
     * Checks if a point is inside a polygon using Ray Casting algorithm.
     * polygonGeoJson is expected to be a GeoJSON string (Polygon or MultiPolygon).
     */
    public static boolean isPointInPolygon(GeoLocation point, @NonNull String polygonGeoJson) {
        if (point == null || polygonGeoJson == null || polygonGeoJson.isEmpty()) {
            return true; // Default to true if no AO defined
        }

        try {
            JsonNode root = objectMapper.readTree(polygonGeoJson);
            String type = root.get("type").asText();
            JsonNode coordinates = root.get("coordinates");

            if ("Polygon".equalsIgnoreCase(type)) {
                return checkPolygon(point, coordinates.get(0)); // Only standard outer ring
            } else if ("MultiPolygon".equalsIgnoreCase(type)) {
                for (JsonNode poly : coordinates) {
                    if (checkPolygon(point, poly.get(0)))
                        return true;
                }
            }
        } catch (Exception e) {
            System.err.println("Error parsing AO GeoJSON: " + e.getMessage());
        }
        return true; // Fallback to visible if parsing fails
    }

    private static boolean checkPolygon(GeoLocation point, JsonNode ring) {
        if (ring == null || !ring.isArray())
            return false;

        boolean inside = false;
        double x = point.getLon();
        double y = point.getLat();

        int n = ring.size();
        for (int i = 0, j = n - 1; i < n; j = i++) {
            double xi = ring.get(i).get(0).asDouble();
            double yi = ring.get(i).get(1).asDouble();
            double xj = ring.get(j).get(0).asDouble();
            double yj = ring.get(j).get(1).asDouble();

            boolean intersect = ((yi > y) != (yj > y))
                    && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
            if (intersect)
                inside = !inside;
        }
        return inside;
    }
}
