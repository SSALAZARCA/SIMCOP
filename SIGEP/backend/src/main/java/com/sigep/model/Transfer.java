package com.sigep.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "transfers")
public class Transfer {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @Column(nullable = false)
    private String soldierId;

    @Column(nullable = false)
    private String soldierName;

    @Column(nullable = false)
    private String rankCategory; // OFICIAL, SUBOFICIAL, SOLDADO

    @Column(nullable = false)
    private String originUnitId;

    @Column(nullable = false)
    private String destinationUnitId;

    @Column(nullable = false)
    private String status; // PENDING_APPROVAL, APPROVED, IN_TRANSIT, COMPLETED, REJECTED

    private String impactLevel; // ALTO, MEDIO, BAJO

    @Column(nullable = false)
    private LocalDateTime createdAt;

    @Column(nullable = false)
    private String createdBy;

    public Transfer() {
    }

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getSoldierId() {
        return soldierId;
    }

    public void setSoldierId(String soldierId) {
        this.soldierId = soldierId;
    }

    public String getSoldierName() {
        return soldierName;
    }

    public void setSoldierName(String soldierName) {
        this.soldierName = soldierName;
    }

    public String getRankCategory() {
        return rankCategory;
    }

    public void setRankCategory(String rankCategory) {
        this.rankCategory = rankCategory;
    }

    public String getOriginUnitId() {
        return originUnitId;
    }

    public void setOriginUnitId(String originUnitId) {
        this.originUnitId = originUnitId;
    }

    public String getDestinationUnitId() {
        return destinationUnitId;
    }

    public void setDestinationUnitId(String destinationUnitId) {
        this.destinationUnitId = destinationUnitId;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public String getImpactLevel() {
        return impactLevel;
    }

    public void setImpactLevel(String impactLevel) {
        this.impactLevel = impactLevel;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public String getCreatedBy() {
        return createdBy;
    }

    public void setCreatedBy(String createdBy) {
        this.createdBy = createdBy;
    }
}
