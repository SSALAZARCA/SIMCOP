package com.simcop.model;

import com.simcop.model.embeddable.GeoLocation;
import jakarta.persistence.*;

@Entity
@Table(name = "after_action_reports")
public class AfterActionReport {

    @Id
    private String id;

    private String unitId;
    private String unitName;
    private long combatEndTimestamp;
    private long reportTimestamp;

    @Embedded
    @AttributeOverrides({
            @AttributeOverride(name = "lat", column = @Column(name = "location_lat")),
            @AttributeOverride(name = "lon", column = @Column(name = "location_lon"))
    })
    private GeoLocation location;

    private int casualtiesKia;
    private int casualtiesWia;
    private int casualtiesMia;
    private String equipmentLosses;
    private double ammunitionExpendedPercent;
    private String morale;

    @Column(length = 2000)
    private String summary;

    private Integer enemyCasualtiesKia;
    private Integer enemyCasualtiesWia;
    private String enemyEquipmentDestroyedOrCaptured;
    private String objectivesAchieved;
    private String positiveObservations;
    private String originalCombatAlertId;

    public AfterActionReport() {
    }

    // Getters and Setters
    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
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

    public long getCombatEndTimestamp() {
        return combatEndTimestamp;
    }

    public void setCombatEndTimestamp(long combatEndTimestamp) {
        this.combatEndTimestamp = combatEndTimestamp;
    }

    public long getReportTimestamp() {
        return reportTimestamp;
    }

    public void setReportTimestamp(long reportTimestamp) {
        this.reportTimestamp = reportTimestamp;
    }

    public GeoLocation getLocation() {
        return location;
    }

    public void setLocation(GeoLocation location) {
        this.location = location;
    }

    public int getCasualtiesKia() {
        return casualtiesKia;
    }

    public void setCasualtiesKia(int casualtiesKia) {
        this.casualtiesKia = casualtiesKia;
    }

    public int getCasualtiesWia() {
        return casualtiesWia;
    }

    public void setCasualtiesWia(int casualtiesWia) {
        this.casualtiesWia = casualtiesWia;
    }

    public int getCasualtiesMia() {
        return casualtiesMia;
    }

    public void setCasualtiesMia(int casualtiesMia) {
        this.casualtiesMia = casualtiesMia;
    }

    public String getEquipmentLosses() {
        return equipmentLosses;
    }

    public void setEquipmentLosses(String equipmentLosses) {
        this.equipmentLosses = equipmentLosses;
    }

    public double getAmmunitionExpendedPercent() {
        return ammunitionExpendedPercent;
    }

    public void setAmmunitionExpendedPercent(double ammunitionExpendedPercent) {
        this.ammunitionExpendedPercent = ammunitionExpendedPercent;
    }

    public String getMorale() {
        return morale;
    }

    public void setMorale(String morale) {
        this.morale = morale;
    }

    public String getSummary() {
        return summary;
    }

    public void setSummary(String summary) {
        this.summary = summary;
    }

    public Integer getEnemyCasualtiesKia() {
        return enemyCasualtiesKia;
    }

    public void setEnemyCasualtiesKia(Integer enemyCasualtiesKia) {
        this.enemyCasualtiesKia = enemyCasualtiesKia;
    }

    public Integer getEnemyCasualtiesWia() {
        return enemyCasualtiesWia;
    }

    public void setEnemyCasualtiesWia(Integer enemyCasualtiesWia) {
        this.enemyCasualtiesWia = enemyCasualtiesWia;
    }

    public String getEnemyEquipmentDestroyedOrCaptured() {
        return enemyEquipmentDestroyedOrCaptured;
    }

    public void setEnemyEquipmentDestroyedOrCaptured(String enemyEquipmentDestroyedOrCaptured) {
        this.enemyEquipmentDestroyedOrCaptured = enemyEquipmentDestroyedOrCaptured;
    }

    public String getObjectivesAchieved() {
        return objectivesAchieved;
    }

    public void setObjectivesAchieved(String objectivesAchieved) {
        this.objectivesAchieved = objectivesAchieved;
    }

    public String getPositiveObservations() {
        return positiveObservations;
    }

    public void setPositiveObservations(String positiveObservations) {
        this.positiveObservations = positiveObservations;
    }

    public String getOriginalCombatAlertId() {
        return originalCombatAlertId;
    }

    public void setOriginalCombatAlertId(String originalCombatAlertId) {
        this.originalCombatAlertId = originalCombatAlertId;
    }
}
