package com.simcop.model;

public enum IntelligenceSourceType {
    HUMINT("HUMINT (Inteligencia Humana)"),
    SIGINT("SIGINT (Inteligencia de Señales)"),
    IMINT("IMINT (Inteligencia de Imágenes)"),
    OSINT("OSINT (Inteligencia de Fuentes Abiertas)"),
    GEOINT("GEOINT (Inteligencia Geoespacial)");

    private final String label;

    IntelligenceSourceType(String label) {
        this.label = label;
    }

    public String getLabel() {
        return label;
    }
}
