package com.simcop.util;

import com.simcop.model.embeddable.GeoLocation;

public class GeoUtils {

    private static final double EARTH_RADIUS_KM = 6371.0;
    private static final double EARTH_RADIUS_METERS = 6371000.0;

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
}
