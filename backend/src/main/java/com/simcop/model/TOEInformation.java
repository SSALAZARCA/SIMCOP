package com.simcop.model;

import jakarta.persistence.Embeddable;
import jakarta.persistence.Embedded;

/**
 * TOE (Table of Organization and Equipment) Information
 * Contiene el personal autorizado y las especialidades requeridas para una
 * unidad
 */
@Embeddable
public class TOEInformation {

    @Embedded
    private AuthorizedPersonnel authorizedPersonnel;

    @Embedded
    private PersonnelSpecialties specialties;

    public TOEInformation() {
        this.authorizedPersonnel = new AuthorizedPersonnel();
        this.specialties = new PersonnelSpecialties();
    }

    public TOEInformation(AuthorizedPersonnel authorizedPersonnel, PersonnelSpecialties specialties) {
        this.authorizedPersonnel = authorizedPersonnel;
        this.specialties = specialties;
    }

    // Getters and Setters
    public AuthorizedPersonnel getAuthorizedPersonnel() {
        return authorizedPersonnel;
    }

    public void setAuthorizedPersonnel(AuthorizedPersonnel authorizedPersonnel) {
        this.authorizedPersonnel = authorizedPersonnel;
    }

    public PersonnelSpecialties getSpecialties() {
        return specialties;
    }

    public void setSpecialties(PersonnelSpecialties specialties) {
        this.specialties = specialties;
    }
}
