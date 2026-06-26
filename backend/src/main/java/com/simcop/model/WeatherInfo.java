package com.simcop.model;

public class WeatherInfo {
    private double temperature;
    private double humidity;
    private double windSpeed;
    private String condition; // e.g., "Soleado", "Lluvia Fuerte", "Niebla"
    private boolean operationalImpact; // true if weather affects operations

    private boolean thunderstorm;
    private double windDirection;
    private double uComponent;
    private double vComponent;
    private double visibility;   // in meters
    private double cloudCover;   // in %
    private double cloudCeiling; // in meters (cloud base height)

    public WeatherInfo() {
    }

    public WeatherInfo(double temperature, double humidity, double windSpeed, String condition,
            boolean operationalImpact, boolean thunderstorm, double windDirection, double uComponent, double vComponent) {
        this(temperature, humidity, windSpeed, condition, operationalImpact, thunderstorm, windDirection, uComponent, vComponent, 10000.0, 0.0, 10000.0);
    }

    public WeatherInfo(double temperature, double humidity, double windSpeed, String condition,
            boolean operationalImpact, boolean thunderstorm, double windDirection, double uComponent, double vComponent,
            double visibility, double cloudCover, double cloudCeiling) {
        this.temperature = temperature;
        this.humidity = humidity;
        this.windSpeed = windSpeed;
        this.condition = condition;
        this.operationalImpact = operationalImpact;
        this.thunderstorm = thunderstorm;
        this.windDirection = windDirection;
        this.uComponent = uComponent;
        this.vComponent = vComponent;
        this.visibility = visibility;
        this.cloudCover = cloudCover;
        this.cloudCeiling = cloudCeiling;
    }

    // Getters and Setters
    public double getVisibility() {
        return visibility;
    }

    public void setVisibility(double visibility) {
        this.visibility = visibility;
    }

    public double getCloudCover() {
        return cloudCover;
    }

    public void setCloudCover(double cloudCover) {
        this.cloudCover = cloudCover;
    }

    public double getCloudCeiling() {
        return cloudCeiling;
    }

    public void setCloudCeiling(double cloudCeiling) {
        this.cloudCeiling = cloudCeiling;
    }

    public boolean isThunderstorm() {
        return thunderstorm;
    }

    public void setThunderstorm(boolean thunderstorm) {
        this.thunderstorm = thunderstorm;
    }

    public double getTemperature() {
        return temperature;
    }

    public void setTemperature(double temperature) {
        this.temperature = temperature;
    }

    public double getHumidity() {
        return humidity;
    }

    public void setHumidity(double humidity) {
        this.humidity = humidity;
    }

    public double getWindSpeed() {
        return windSpeed;
    }

    public void setWindSpeed(double windSpeed) {
        this.windSpeed = windSpeed;
    }

    public String getCondition() {
        return condition;
    }

    public void setCondition(String condition) {
        this.condition = condition;
    }

    public boolean isOperationalImpact() {
        return operationalImpact;
    }

    public void setOperationalImpact(boolean operationalImpact) {
        this.operationalImpact = operationalImpact;
    }

    public double getWindDirection() {
        return windDirection;
    }

    public void setWindDirection(double windDirection) {
        this.windDirection = windDirection;
    }

    public double getuComponent() {
        return uComponent;
    }

    public void setuComponent(double uComponent) {
        this.uComponent = uComponent;
    }

    public double getvComponent() {
        return vComponent;
    }

    public void setvComponent(double vComponent) {
        this.vComponent = vComponent;
    }
}
