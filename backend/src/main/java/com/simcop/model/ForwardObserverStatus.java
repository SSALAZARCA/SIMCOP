package com.simcop.model;

public enum ForwardObserverStatus {
    OPERATIONAL("Operacional"),
    OBSERVING("Observando Blanco"),
    MOVING("En Movimiento"),
    NO_COMMS("Sin Comunicación");

    private final String label;

    ForwardObserverStatus(String label) {
        this.label = label;
    }

    public String getLabel() {
        return label;
    }
}
