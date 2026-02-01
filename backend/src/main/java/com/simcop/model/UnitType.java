package com.simcop.model;

public enum UnitType {
    DIVISION("División"),
    BRIGADE("Brigada"),
    BATTALION("Batallón"),
    COMPANY("Compañía"),
    PLATOON("Pelotón"),
    TEAM("Equipo"),
    SQUAD("Escuadra"),
    COMMAND_POST("Puesto de Mando"),
    UAV_ATTACK_TEAM("Equipo Drone Ataque"),
    UAV_INTEL_TEAM("Equipo Drone Inteligencia");

    private final String label;

    UnitType(String label) {
        this.label = label;
    }

    public String getLabel() {
        return label;
    }
}
