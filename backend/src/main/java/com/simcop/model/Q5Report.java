package com.simcop.model;

import jakarta.persistence.*;

@Entity
@Table(name = "q5_reports")
public class Q5Report {

    @Id
    private String id;

    private String aarId;
    private String unitId;
    private String unitName;
    private long reportTimestamp;

    @Column(length = 1000)
    private String que;

    @Column(length = 1000)
    private String quien;

    @Column(length = 1000)
    private String cuando;

    @Column(length = 1000)
    private String donde;

    @Column(length = 2000)
    private String hechos;

    @Column(length = 1000)
    private String accionesSubsiguientes;

    public Q5Report() {
    }

    // Getters and Setters
    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getAarId() {
        return aarId;
    }

    public void setAarId(String aarId) {
        this.aarId = aarId;
    }

    public String getUnitId() {
        return unitId;
    }

    public void setUnitId(String unitId) {
        this.unitId = unitId;
    }

    public String getUnitName() {
        return unitName;
    }

    public void setUnitName(String unitName) {
        this.unitName = unitName;
    }

    public long getReportTimestamp() {
        return reportTimestamp;
    }

    public void setReportTimestamp(long reportTimestamp) {
        this.reportTimestamp = reportTimestamp;
    }

    public String getQue() {
        return que;
    }

    public void setQue(String que) {
        this.que = que;
    }

    public String getQuien() {
        return quien;
    }

    public void setQuien(String quien) {
        this.quien = quien;
    }

    public String getCuando() {
        return cuando;
    }

    public void setCuando(String cuando) {
        this.cuando = cuando;
    }

    public String getDonde() {
        return donde;
    }

    public void setDonde(String donde) {
        this.donde = donde;
    }

    public String getHechos() {
        return hechos;
    }

    public void setHechos(String hechos) {
        this.hechos = hechos;
    }

    public String getAccionesSubsiguientes() {
        return accionesSubsiguientes;
    }

    public void setAccionesSubsiguientes(String accionesSubsiguientes) {
        this.accionesSubsiguientes = accionesSubsiguientes;
    }
}
