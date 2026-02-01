package com.simcop.model;

public enum AlertSeverity {
    CRITICAL("Crítica"),
    HIGH("Alta"),
    MEDIUM("Media"),
    LOW("Baja"),
    INFO("Informativa");

    private final String label;

    AlertSeverity(String label) {
        this.label = label;
    }

    public String getLabel() {
        return label;
    }
}
