package com.simcop.model;

public enum ArtilleryStatus {
    READY("Disponible"),
    FIRING("En Misión de Fuego"),
    MOVING("En Movimiento"),
    MAINTENANCE("Mantenimiento"),
    OUT_OF_AMMO("Sin Munición");

    private final String label;

    ArtilleryStatus(String label) {
        this.label = label;
    }

    public String getLabel() {
        return label;
    }
}
