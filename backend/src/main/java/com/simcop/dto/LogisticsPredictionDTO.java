package com.simcop.dto;

public class LogisticsPredictionDTO {
    private String unitId;
    private String unitName;
    private double daysRemaining;
    private String status;
    private String recommendation;

    public LogisticsPredictionDTO() {
    }

    public LogisticsPredictionDTO(String unitId, String unitName, double daysRemaining, String status,
            String recommendation) {
        this.unitId = unitId;
        this.unitName = unitName;
        this.daysRemaining = daysRemaining;
        this.status = status;
        this.recommendation = recommendation;
    }

    // Getters and Setters
    public String getUnitId() {
        return unitId;
    }

    public void setUnitId(String unitId) {
        this.unitId = unitId;
    }

    public String getUnitName() {
        return unitName;
    }

    public void setUnitName(String unitName) {
        this.unitName = unitName;
    }

    public double getDaysRemaining() {
        return daysRemaining;
    }

    public void setDaysRemaining(double daysRemaining) {
        this.daysRemaining = daysRemaining;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public String getRecommendation() {
        return recommendation;
    }

    public void setRecommendation(String recommendation) {
        this.recommendation = recommendation;
    }
}
