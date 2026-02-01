package com.simcop.model;

public enum IntelligenceReliability {
    A("A - Completamente Fiable"),
    B("B - Usualmente Fiable"),
    C("C - Medianamente Fiable"),
    D("D - No Usualmente Fiable"),
    E("E - No Fiable"),
    F("F - Fiabilidad No Puede Ser Juzgada");

    private final String label;

    IntelligenceReliability(String label) {
        this.label = label;
    }

    public String getLabel() {
        return label;
    }
}
