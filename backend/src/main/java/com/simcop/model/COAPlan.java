package com.simcop.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "coa_plans")
public class COAPlan {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @Column(nullable = false)
    private String planName;

    @Lob
    @Column(columnDefinition = "TEXT", nullable = false)
    private String conceptOfOperations;

    // Store phases as JSON string
    @Lob
    @Column(columnDefinition = "LONGTEXT", nullable = false)
    private String phasesJson;

    // Metadata
    private String createdByUserId;

    @Column(nullable = false)
    private LocalDateTime createdTimestamp;

    private LocalDateTime hiddenTimestamp; // Soft delete

    // Constructors
    public COAPlan() {
    }

    public COAPlan(String id, String planName, String conceptOfOperations, String phasesJson,
            String createdByUserId, LocalDateTime createdTimestamp, LocalDateTime hiddenTimestamp) {
        this.id = id;
        this.planName = planName;
        this.conceptOfOperations = conceptOfOperations;
        this.phasesJson = phasesJson;
        this.createdByUserId = createdByUserId;
        this.createdTimestamp = createdTimestamp;
        this.hiddenTimestamp = hiddenTimestamp;
    }

    // Getters and Setters
    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getPlanName() {
        return planName;
    }

    public void setPlanName(String planName) {
        this.planName = planName;
    }

    public String getConceptOfOperations() {
        return conceptOfOperations;
    }

    public void setConceptOfOperations(String conceptOfOperations) {
        this.conceptOfOperations = conceptOfOperations;
    }

    public String getPhasesJson() {
        return phasesJson;
    }

    public void setPhasesJson(String phasesJson) {
        this.phasesJson = phasesJson;
    }

    public String getCreatedByUserId() {
        return createdByUserId;
    }

    public void setCreatedByUserId(String createdByUserId) {
        this.createdByUserId = createdByUserId;
    }

    public LocalDateTime getCreatedTimestamp() {
        return createdTimestamp;
    }

    public void setCreatedTimestamp(LocalDateTime createdTimestamp) {
        this.createdTimestamp = createdTimestamp;
    }

    public LocalDateTime getHiddenTimestamp() {
        return hiddenTimestamp;
    }

    public void setHiddenTimestamp(LocalDateTime hiddenTimestamp) {
        this.hiddenTimestamp = hiddenTimestamp;
    }
}
