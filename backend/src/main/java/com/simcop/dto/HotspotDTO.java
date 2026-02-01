package com.simcop.dto;

import com.simcop.model.embeddable.GeoLocation;

public class HotspotDTO {
    private GeoLocation center;
    private double radius;
    private int intensity; // Number of reports in the cluster
    private String description;

    public HotspotDTO(GeoLocation center, double radius, int intensity, String description) {
        this.center = center;
        this.radius = radius;
        this.intensity = intensity;
        this.description = description;
    }

    // Getters
    public GeoLocation getCenter() {
        return center;
    }

    public double getRadius() {
        return radius;
    }

    public int getIntensity() {
        return intensity;
    }

    public String getDescription() {
        return description;
    }
}
