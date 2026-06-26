package com.simcop.dto;

public class BMARecommendationDTO {
    private String unitId;
    private String unitName;
    private String reasoning;
    private double score;
    private double estimatedTimeToIntercept; // in minutes

    public BMARecommendationDTO() {
    }

    public BMARecommendationDTO(String unitId, String unitName, String reasoning, double score,
            double estimatedTimeToIntercept) {
        this.unitId = unitId;
        this.unitName = unitName;
        this.reasoning = reasoning;
        this.score = score;
        this.estimatedTimeToIntercept = estimatedTimeToIntercept;
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

    public String getReasoning() {
        return reasoning;
    }

    public void setReasoning(String reasoning) {
        this.reasoning = reasoning;
    }

    public double getScore() {
        return score;
    }

    public void setScore(double score) {
        this.score = score;
    }

    public double getEstimatedTimeToIntercept() {
        return estimatedTimeToIntercept;
    }

    public void setEstimatedTimeToIntercept(double estimatedTimeToIntercept) {
        this.estimatedTimeToIntercept = estimatedTimeToIntercept;
    }
}
