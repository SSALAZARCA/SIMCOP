package com.simcop.model;

public enum UnitStatus {
    OPERATIONAL("Operacional"),
    MOVING("En Movimiento"),
    STATIC("Estático"),
    ENGAGED("En Combate"),
    LOW_SUPPLIES("Suministros Bajos"),
    NO_COMMUNICATION("Sin Comunicación"),
    MAINTENANCE("Mantenimiento"),
    AAR_PENDING("Pendiente Reporte Post-Combate"),
    ON_LEAVE_RETRAINING("Permiso/Reentrenamiento");

    private final String label;

    UnitStatus(String label) {
        this.label = label;
    }

    public String getLabel() {
        return label;
    }
}
