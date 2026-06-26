package com.simcop.model;

import jakarta.persistence.ElementCollection;
import jakarta.persistence.Embeddable;
import jakarta.persistence.CollectionTable;
import jakarta.persistence.JoinColumn;
import java.util.ArrayList;
import java.util.List;

/**
 * Especialidades por categoría de personal
 * Contiene las listas de especialidades requeridas para cada categoría
 */
@Embeddable
public class PersonnelSpecialties {

    @ElementCollection
    @CollectionTable(name = "officer_specialties", joinColumns = @JoinColumn(name = "unit_id"))
    private List<MilitarySpecialty> officers = new ArrayList<>();

    @ElementCollection
    @CollectionTable(name = "nco_specialties", joinColumns = @JoinColumn(name = "unit_id"))
    private List<MilitarySpecialty> ncos = new ArrayList<>();

    @ElementCollection
    @CollectionTable(name = "professional_soldier_specialties", joinColumns = @JoinColumn(name = "unit_id"))
    private List<MilitarySpecialty> professionalSoldiers = new ArrayList<>();

    @ElementCollection
    @CollectionTable(name = "regular_soldier_specialties", joinColumns = @JoinColumn(name = "unit_id"))
    private List<MilitarySpecialty> regularSoldiers = new ArrayList<>();

    @ElementCollection
    @CollectionTable(name = "civilian_specialties", joinColumns = @JoinColumn(name = "unit_id"))
    private List<MilitarySpecialty> civilians = new ArrayList<>();

    public PersonnelSpecialties() {
    }

    // Getters and Setters
    public List<MilitarySpecialty> getOfficers() {
        return officers;
    }

    public void setOfficers(List<MilitarySpecialty> officers) {
        this.officers = officers;
    }

    public List<MilitarySpecialty> getNcos() {
        return ncos;
    }

    public void setNcos(List<MilitarySpecialty> ncos) {
        this.ncos = ncos;
    }

    public List<MilitarySpecialty> getProfessionalSoldiers() {
        return professionalSoldiers;
    }

    public void setProfessionalSoldiers(List<MilitarySpecialty> professionalSoldiers) {
        this.professionalSoldiers = professionalSoldiers;
    }

    public List<MilitarySpecialty> getRegularSoldiers() {
        return regularSoldiers;
    }

    public void setRegularSoldiers(List<MilitarySpecialty> regularSoldiers) {
        this.regularSoldiers = regularSoldiers;
    }

    public List<MilitarySpecialty> getCivilians() {
        return civilians;
    }

    public void setCivilians(List<MilitarySpecialty> civilians) {
        this.civilians = civilians;
    }
}
