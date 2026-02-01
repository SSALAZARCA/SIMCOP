package com.simcop.model;

import com.simcop.model.embeddable.GeoLocation;
import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "fire_missions")
public class FireMission {

    @Id
    private String id;

    private String requesterId;

    @Embedded
    private GeoLocation targetLocation;

    @Enumerated(EnumType.STRING)
    private FireMissionStatus status;

    private String assignedArtilleryId; // The ID of the ArtilleryPiece assigned

    private Long requestTimestamp;
    private Long fireTimestamp;
    private Long completedTimestamp;

    private String rejectionReason;

    // Ballistic solution data (simplified)
    private String projectileType; // HE, SMOKE, etc.
    private Integer charge;

    public FireMission() {
    }

    // Getters and Setters
    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getRequesterId() {
        return requesterId;
    }

    public void setRequesterId(String requesterId) {
        this.requesterId = requesterId;
    }

    public GeoLocation getTargetLocation() {
        return targetLocation;
    }

    public void setTargetLocation(GeoLocation targetLocation) {
        this.targetLocation = targetLocation;
    }

    public FireMissionStatus getStatus() {
        return status;
    }

    public void setStatus(FireMissionStatus status) {
        this.status = status;
    }

    public String getAssignedArtilleryId() {
        return assignedArtilleryId;
    }

    public void setAssignedArtilleryId(String assignedArtilleryId) {
        this.assignedArtilleryId = assignedArtilleryId;
    }

    public Long getRequestTimestamp() {
        return requestTimestamp;
    }

    public void setRequestTimestamp(Long requestTimestamp) {
        this.requestTimestamp = requestTimestamp;
    }

    public Long getFireTimestamp() {
        return fireTimestamp;
    }

    public void setFireTimestamp(Long fireTimestamp) {
        this.fireTimestamp = fireTimestamp;
    }

    public Long getCompletedTimestamp() {
        return completedTimestamp;
    }

    public void setCompletedTimestamp(Long completedTimestamp) {
        this.completedTimestamp = completedTimestamp;
    }

    public String getRejectionReason() {
        return rejectionReason;
    }

    public void setRejectionReason(String rejectionReason) {
        this.rejectionReason = rejectionReason;
    }

    public String getProjectileType() {
        return projectileType;
    }

    public void setProjectileType(String projectileType) {
        this.projectileType = projectileType;
    }

    public Integer getCharge() {
        return charge;
    }

    public void setCharge(Integer charge) {
        this.charge = charge;
    }
}
