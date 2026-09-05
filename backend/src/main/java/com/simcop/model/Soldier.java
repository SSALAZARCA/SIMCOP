package com.simcop.model;

import jakarta.persistence.*;
import java.time.LocalDate;
import java.util.Map;
import java.util.HashMap;
import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonProperty;

@Entity
@Table(name = "soldiers")
public class Soldier {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @Column(nullable = false)
    private String fullName;

    @Column(nullable = false)
    private String rank;

    @Column(nullable = false)
    private String moceCode; // Especialidad

    private String status; // ACTIVO, VACACIONES, etc.
    private String healthStatus; // APTO, NO APTO
    private String legalStatus; // HABILITADO, INVESTIGACION
    private String cursosCombate; // Ej: LANCERO, PARACAIDISTA, INTELIGENCIA

    private Integer timeInPosition; // Meses

    private LocalDate estimatedRetirementDate;

    @ManyToOne
    @JoinColumn(name = "unit_id", columnDefinition = "VARCHAR(255)")
    @JsonIgnore
    private MilitaryUnit unit;

    @JsonProperty("unitId")
    public String getUnitId() {
        return unit != null ? unit.getId() : null;
    }

    @JsonProperty("unit")
    public Map<String, Object> getUnitSummary() {
        if (unit == null) return null;
        Map<String, Object> map = new HashMap<>();
        map.put("id", unit.getId());
        map.put("name", unit.getName() != null ? unit.getName() : "");
        map.put("status", unit.getStatus() != null ? unit.getStatus().name() : null);
        return map;
    }

    public Soldier() {
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getFullName() {
        return fullName;
    }

    public void setFullName(String fullName) {
        this.fullName = fullName;
    }

    public String getRank() {
        return rank;
    }

    public void setRank(String rank) {
        this.rank = rank;
    }

    public String getMoceCode() {
        return moceCode;
    }

    public void setMoceCode(String moceCode) {
        this.moceCode = moceCode;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public String getHealthStatus() {
        return healthStatus;
    }

    public void setHealthStatus(String healthStatus) {
        this.healthStatus = healthStatus;
    }

    public String getLegalStatus() {
        return legalStatus;
    }

    public void setLegalStatus(String legalStatus) {
        this.legalStatus = legalStatus;
    }

    public Integer getTimeInPosition() {
        return timeInPosition;
    }

    public void setTimeInPosition(Integer timeInPosition) {
        this.timeInPosition = timeInPosition;
    }

    public String getCursosCombate() {
        return cursosCombate;
    }

    public void setCursosCombate(String cursosCombate) {
        this.cursosCombate = cursosCombate;
    }

    public LocalDate getEstimatedRetirementDate() {
        return estimatedRetirementDate;
    }

    public void setEstimatedRetirementDate(LocalDate estimatedRetirementDate) {
        this.estimatedRetirementDate = estimatedRetirementDate;
    }

    @JsonIgnore
    public MilitaryUnit getUnit() {
        return unit;
    }

    public void setUnit(MilitaryUnit unit) {
        this.unit = unit;
    }
}
