package com.simcop.model;

public class WeatherInfo {
    private double temperature;
    private double humidity;
    private double windSpeed;
    private String condition; // e.g., "Soleado", "Lluvia Fuerte", "Niebla"
    private boolean operationalImpact; // true if weather affects operations

    public WeatherInfo() {
    }

    public WeatherInfo(double temperature, double humidity, double windSpeed, String condition,
            boolean operationalImpact) {
        this.temperature = temperature;
        this.humidity = humidity;
        this.windSpeed = windSpeed;
        this.condition = condition;
        this.operationalImpact = operationalImpact;
    }

    // Getters and Setters
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
}
