package com.simcop.model.embeddable;

import jakarta.persistence.Embeddable;

@Embeddable
public class RoutePoint {
    private double lat;
    private double lon;
    private long timestamp;

    public RoutePoint() {}

    public RoutePoint(double lat, double lon, long timestamp) {
        this.lat = lat;
        this.lon = lon;
        this.timestamp = timestamp;
    }

    public double getLat() {
        return lat;
    }

    public void setLat(double lat) {
        this.lat = lat;
    }

    public double getLon() {
        return lon;
    }

    public void setLon(double lon) {
        this.lon = lon;
    }

    public long getTimestamp() {
        return timestamp;
    }

    public void setTimestamp(long timestamp) {
        this.timestamp = timestamp;
    }
}
