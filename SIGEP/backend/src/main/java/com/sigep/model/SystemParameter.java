package com.sigep.model;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "system_parameters")
public class SystemParameter {

    @Id
    private String parameterKey;

    private String parameterValue;

    private String description;

    public SystemParameter() {
    }

    public SystemParameter(String parameterKey, String parameterValue, String description) {
        this.parameterKey = parameterKey;
        this.parameterValue = parameterValue;
        this.description = description;
    }

    public String getParameterKey() {
        return parameterKey;
    }

    public void setParameterKey(String parameterKey) {
        this.parameterKey = parameterKey;
    }

    public String getParameterValue() {
        return parameterValue;
    }

    public void setParameterValue(String parameterValue) {
        this.parameterValue = parameterValue;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }
}
