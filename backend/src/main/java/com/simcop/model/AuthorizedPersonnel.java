package com.simcop.model;

import jakarta.persistence.Embeddable;

/**
 * Personal autorizado por categoría
 * Representa lo que la unidad DEBERÍA tener según su TOE
 */
@Embeddable
public class AuthorizedPersonnel {
    private int officers;
    private int ncos; // Suboficiales
    private int professionalSoldiers;
    private int regularSoldiers;
    private int civilians;

    public AuthorizedPersonnel() {
    }

    public AuthorizedPersonnel(int officers, int ncos, int professionalSoldiers,
            int regularSoldiers, int civilians) {
        this.officers = officers;
        this.ncos = ncos;
        this.professionalSoldiers = professionalSoldiers;
        this.regularSoldiers = regularSoldiers;
        this.civilians = civilians;
    }

    // Getters and Setters
    public int getOfficers() {
        return officers;
    }

    public void setOfficers(int officers) {
        this.officers = officers;
    }

    public int getNcos() {
        return ncos;
    }

    public void setNcos(int ncos) {
        this.ncos = ncos;
    }

    public int getProfessionalSoldiers() {
        return professionalSoldiers;
    }

    public void setProfessionalSoldiers(int professionalSoldiers) {
        this.professionalSoldiers = professionalSoldiers;
    }

    public int getRegularSoldiers() {
        return regularSoldiers;
    }

    public void setRegularSoldiers(int regularSoldiers) {
        this.regularSoldiers = regularSoldiers;
    }

    public int getCivilians() {
        return civilians;
    }

    public void setCivilians(int civilians) {
        this.civilians = civilians;
    }
}
