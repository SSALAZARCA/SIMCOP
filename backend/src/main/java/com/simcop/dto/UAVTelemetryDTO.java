package com.simcop.dto;

import com.simcop.model.embeddable.GeoLocation;

public class UAVTelemetryDTO {
    private String uavId;
    private String modelName;
    private String connectionProtocol; // MAVLINK, RTSP, WEBHOOK, SIMULATED
    private Double batteryLevel;
    private GeoLocation location; // Current drone location
    private Double altitude; // Metros
    private Double speed; // km/h
    private Double heading; // Grados 0-360
    private String cameraMode; // EO, FLIR, NVG
    private String status; // ON_STATION, EN_ROUTE, RTH, ORBITING, LANDED
    private String streamUrl; // Update stream URL if changed
    private Integer satellites;
    private Integer signalStrength;
    private Long timestamp;

    public UAVTelemetryDTO() {
        this.timestamp = System.currentTimeMillis();
    }

    // Getters and Setters
    public String getUavId() {
        return uavId;
    }

    public void setUavId(String uavId) {
        this.uavId = uavId;
    }

    public String getModelName() {
        return modelName;
    }

    public void setModelName(String modelName) {
        this.modelName = modelName;
    }

    public String getConnectionProtocol() {
        return connectionProtocol;
    }

    public void setConnectionProtocol(String connectionProtocol) {
        this.connectionProtocol = connectionProtocol;
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

    public Double getAltitude() {
        return altitude;
    }

    public void setAltitude(Double altitude) {
        this.altitude = altitude;
    }

    public Double getSpeed() {
        return speed;
    }

    public void setSpeed(Double speed) {
        this.speed = speed;
    }

    public Double getHeading() {
        return heading;
    }

    public void setHeading(Double heading) {
        this.heading = heading;
    }

    public String getCameraMode() {
        return cameraMode;
    }

    public void setCameraMode(String cameraMode) {
        this.cameraMode = cameraMode;
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

    public Integer getSatellites() {
        return satellites;
    }

    public void setSatellites(Integer satellites) {
        this.satellites = satellites;
    }

    public Integer getSignalStrength() {
        return signalStrength;
    }

    public void setSignalStrength(Integer signalStrength) {
        this.signalStrength = signalStrength;
    }

    public Long getTimestamp() {
        return timestamp;
    }

    public void setTimestamp(Long timestamp) {
        this.timestamp = timestamp;
    }
}
