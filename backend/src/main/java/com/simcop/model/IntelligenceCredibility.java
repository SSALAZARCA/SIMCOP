package com.simcop.model;

public enum IntelligenceCredibility {
    ONE("1 - Confirmado por otras fuentes"),
    TWO("2 - Probablemente Verdadero"),
    THREE("3 - Posiblemente Verdadero"),
    FOUR("Dudosamente Verdadero"),
    FIVE("5 - Improbable"),
    SIX("6 - Veracidad No Puede Ser Juzgada");

    private final String label;

    IntelligenceCredibility(String label) {
        this.label = label;
    }

    public String getLabel() {
        return label;
    }
}
