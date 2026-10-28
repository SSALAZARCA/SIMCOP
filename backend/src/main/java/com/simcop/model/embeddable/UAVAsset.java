package com.simcop.model.embeddable;

import jakarta.persistence.Embeddable;

@Embeddable
public class UAVAsset {

    private String uavId;
    private String uavType; // ATTACK, INTEL, SPECIALIZED
    private String modelName; // Ej: DJI Matrice 300, Raven RQ-11B, VTOL Hermes
    private String connectionProtocol; // MAVLINK, RTSP, WEBHOOK, SIMULATED
    private String ipAddress;
    private Integer port;
    private String telemetryToken;
    private Double batteryStatus; // 0-100
    private Double currentPayload; // For attack drones
    private String streamUrl; // For specialized intel drones
    private Double operationalRadius; // In km
    private GeoLocation location;
    private Double altitudeMeters; // Altitud AGL/MSL
    private Double speedKmh; // Velocidad de avance
    private Double headingDegrees; // Rumbo 0-360
    private String cameraMode; // EO, FLIR, NVG
    private String flightStatus; // ON_STATION, EN_ROUTE, RTH, ORBITING, LANDED
    private Integer signalStrength; // 0-100%
    private Integer satellites; // Cantidad GPS
    private Long lastHeartbeat; // Timestamp

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
        this.connectionProtocol = "SIMULATED";
        this.flightStatus = "ON_STATION";
        this.cameraMode = "EO";
        this.altitudeMeters = 120.0;
        this.speedKmh = 45.0;
        this.headingDegrees = 0.0;
        this.signalStrength = 95;
        this.satellites = 16;
        this.lastHeartbeat = System.currentTimeMillis();
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

    public String getIpAddress() {
        return ipAddress;
    }

    public void setIpAddress(String ipAddress) {
        this.ipAddress = ipAddress;
    }

    public Integer getPort() {
        return port;
    }

    public void setPort(Integer port) {
        this.port = port;
    }

    public String getTelemetryToken() {
        return telemetryToken;
    }

    public void setTelemetryToken(String telemetryToken) {
        this.telemetryToken = telemetryToken;
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

    public Double getAltitudeMeters() {
        return altitudeMeters;
    }

    public void setAltitudeMeters(Double altitudeMeters) {
        this.altitudeMeters = altitudeMeters;
    }

    public Double getSpeedKmh() {
        return speedKmh;
    }

    public void setSpeedKmh(Double speedKmh) {
        this.speedKmh = speedKmh;
    }

    public Double getHeadingDegrees() {
        return headingDegrees;
    }

    public void setHeadingDegrees(Double headingDegrees) {
        this.headingDegrees = headingDegrees;
    }

    public String getCameraMode() {
        return cameraMode;
    }

    public void setCameraMode(String cameraMode) {
        this.cameraMode = cameraMode;
    }

    public String getFlightStatus() {
        return flightStatus;
    }

    public void setFlightStatus(String flightStatus) {
        this.flightStatus = flightStatus;
    }

    public Integer getSignalStrength() {
        return signalStrength;
    }

    public void setSignalStrength(Integer signalStrength) {
        this.signalStrength = signalStrength;
    }

    public Integer getSatellites() {
        return satellites;
    }

    public void setSatellites(Integer satellites) {
        this.satellites = satellites;
    }

    public Long getLastHeartbeat() {
        return lastHeartbeat;
    }

    public void setLastHeartbeat(Long lastHeartbeat) {
        this.lastHeartbeat = lastHeartbeat;
    }
}
