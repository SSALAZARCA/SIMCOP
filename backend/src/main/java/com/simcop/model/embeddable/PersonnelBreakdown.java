package com.simcop.model.embeddable;

import jakarta.persistence.Embeddable;

@Embeddable
public class PersonnelBreakdown {
    private int officers;
    private int ncos;
    private int professionalSoldiers;
    private int slRegulars;

    public PersonnelBreakdown() {}

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

    public int getSlRegulars() {
        return slRegulars;
    }

    public void setSlRegulars(int slRegulars) {
        this.slRegulars = slRegulars;
    }
}
