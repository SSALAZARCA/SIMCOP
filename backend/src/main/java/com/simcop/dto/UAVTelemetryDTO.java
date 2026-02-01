package com.simcop.dto;

import com.simcop.model.embeddable.GeoLocation;

public class UAVTelemetryDTO {
    private String uavId;
    private Double batteryLevel;
    private GeoLocation location; // Current drone location
    private String status; // ON_STATION, EN_ROUTE, LANDED
    private String streamUrl; // Update stream URL if changed

    // Getters and Setters
    public String getUavId() {
        return uavId;
    }

    public void setUavId(String uavId) {
        this.uavId = uavId;
    }

    public Double getBatteryLevel() {
        return batteryLevel;
    }

    public void setBatteryLevel(Double batteryLevel) {
        this.batteryLevel = batteryLevel;
    }

    public GeoLocation getLocation() {
        return location;
    }

    public void setLocation(GeoLocation location) {
        this.location = location;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public String getStreamUrl() {
        return streamUrl;
    }

    public void setStreamUrl(String streamUrl) {
        this.streamUrl = streamUrl;
    }
}
