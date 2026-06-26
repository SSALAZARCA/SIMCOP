package com.simcop.model.embeddable;

import jakarta.persistence.Embeddable;

@Embeddable
public class UAVAsset {

    private String uavId;
    private String uavType; // ATTACK, INTEL, SPECIALIZED
    private Double batteryStatus; // 0-100
    private Double currentPayload; // For attack drones
    private String streamUrl; // For specialized intel drones
    private Double operationalRadius; // In km
    private GeoLocation location;

    public UAVAsset() {
    }

    public UAVAsset(String uavId, String uavType, Double batteryStatus, Double currentPayload, String streamUrl,
            Double operationalRadius) {
        this.uavId = uavId;
        this.uavType = uavType;
        this.batteryStatus = batteryStatus;
        this.currentPayload = currentPayload;
        this.streamUrl = streamUrl;
        this.operationalRadius = operationalRadius;
    }

    public String getUavId() {
        return uavId;
    }

    public void setUavId(String uavId) {
        this.uavId = uavId;
    }

    public String getUavType() {
        return uavType;
    }

    public void setUavType(String uavType) {
        this.uavType = uavType;
    }

    public Double getBatteryStatus() {
        return batteryStatus;
    }

    public void setBatteryStatus(Double batteryStatus) {
        this.batteryStatus = batteryStatus;
    }

    public Double getCurrentPayload() {
        return currentPayload;
    }

    public void setCurrentPayload(Double currentPayload) {
        this.currentPayload = currentPayload;
    }

    public String getStreamUrl() {
        return streamUrl;
    }

    public void setStreamUrl(String streamUrl) {
        this.streamUrl = streamUrl;
    }

    public Double getOperationalRadius() {
        return operationalRadius;
    }

    public void setOperationalRadius(Double operationalRadius) {
        this.operationalRadius = operationalRadius;
    }

    public GeoLocation getLocation() {
        return location;
    }

    public void setLocation(GeoLocation location) {
        this.location = location;
    }
}
