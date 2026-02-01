package com.simcop.model;

public enum OperationsOrderStatus {
    BORRADOR("Borrador"),
    PUBLICADA("Publicada"),
    ARCHIVADA("Archivada");

    private final String label;

    OperationsOrderStatus(String label) {
        this.label = label;
    }

    public String getLabel() {
        return label;
    }
}
