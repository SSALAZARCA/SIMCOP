package com.simcop.dto;

public class DatabaseStatsDTO {
    private long totalUsers;
    private long totalUnits;
    private long totalAlerts;
    private long totalOsintEvents;
    private long totalFireMissions;

    public DatabaseStatsDTO() {
    }

    public long getTotalUsers() {
        return totalUsers;
    }

    public void setTotalUsers(long totalUsers) {
        this.totalUsers = totalUsers;
    }

    public long getTotalUnits() {
        return totalUnits;
    }

    public void setTotalUnits(long totalUnits) {
        this.totalUnits = totalUnits;
    }

    public long getTotalAlerts() {
        return totalAlerts;
    }

    public void setTotalAlerts(long totalAlerts) {
        this.totalAlerts = totalAlerts;
    }

    public long getTotalOsintEvents() {
        return totalOsintEvents;
    }

    public void setTotalOsintEvents(long totalOsintEvents) {
        this.totalOsintEvents = totalOsintEvents;
    }

    public long getTotalFireMissions() {
        return totalFireMissions;
    }

    public void setTotalFireMissions(long totalFireMissions) {
        this.totalFireMissions = totalFireMissions;
    }
}
