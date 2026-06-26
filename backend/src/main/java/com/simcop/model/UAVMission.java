package com.simcop.model;

import com.simcop.model.embeddable.GeoLocation;
import jakarta.persistence.*;

@Entity
@Table(name = "uav_missions")
public class UAVMission {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    private String requesterUnitId; // ID of the platoon requesting support

    private String droneUnitId; // ID of the UAV unit providing support
    private String droneAssetId; // Specific asset ID if applicable

    @Embedded
    @AttributeOverrides({
            @AttributeOverride(name = "lat", column = @Column(name = "target_lat")),
            @AttributeOverride(name = "lon", column = @Column(name = "target_lon"))
    })
    private GeoLocation targetLocation;

    @Enumerated(EnumType.STRING)
    private UAVMissionType type; // STRIKE, RECON

    @Enumerated(EnumType.STRING)
    private UAVMissionStatus status; // REQUESTED, EN_ROUTE, ON_STATION, COMPLETED, REJECTED

    private Long timestamp;
    private String details; // e.g. "Support requested for sector Alpha"

    public UAVMission() {
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getRequesterUnitId() {
        return requesterUnitId;
    }

    public void setRequesterUnitId(String requesterUnitId) {
        this.requesterUnitId = requesterUnitId;
    }

    public String getDroneUnitId() {
        return droneUnitId;
    }

    public void setDroneUnitId(String droneUnitId) {
        this.droneUnitId = droneUnitId;
    }

    public String getDroneAssetId() {
        return droneAssetId;
    }

    public void setDroneAssetId(String droneAssetId) {
        this.droneAssetId = droneAssetId;
    }

    public GeoLocation getTargetLocation() {
        return targetLocation;
    }

    public void setTargetLocation(GeoLocation targetLocation) {
        this.targetLocation = targetLocation;
    }

    public UAVMissionType getType() {
        return type;
    }

    public void setType(UAVMissionType type) {
        this.type = type;
    }

    public UAVMissionStatus getStatus() {
        return status;
    }

    public void setStatus(UAVMissionStatus status) {
        this.status = status;
    }

    public Long getTimestamp() {
        return timestamp;
    }

    public void setTimestamp(Long timestamp) {
        this.timestamp = timestamp;
    }

    public String getDetails() {
        return details;
    }

    public void setDetails(String details) {
        this.details = details;
    }
}
