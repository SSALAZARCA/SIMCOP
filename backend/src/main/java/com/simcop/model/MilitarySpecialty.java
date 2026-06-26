package com.simcop.model;

import jakarta.persistence.Embeddable;

/**
 * Especialidad militar (MOS del Ejército Colombiano)
 * Representa una especialidad con su código MOS, nombre y cantidad requerida
 */
@Embeddable
public class MilitarySpecialty {
    private String code; // Código MOS (ej: "11B", "31B")
    private String name; // Nombre de la especialidad
    private int quantity; // Cantidad requerida

    public MilitarySpecialty() {
    }

    public MilitarySpecialty(String code, String name, int quantity) {
        this.code = code;
        this.name = name;
        this.quantity = quantity;
    }

    // Getters and Setters
    public String getCode() {
        return code;
    }

    public void setCode(String code) {
        this.code = code;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public int getQuantity() {
        return quantity;
    }

    public void setQuantity(int quantity) {
        this.quantity = quantity;
    }
}
