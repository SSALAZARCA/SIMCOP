package com.simcop.model;

public enum FireMissionStatus {
    PENDING,
    APPROVED, // Assigned to a battery/gun but not yet firing
    REJECTED,
    ACTIVE, // Firing in progress
    COMPLETED,
    CANCELLED
}
