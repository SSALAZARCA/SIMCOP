package com.simcop.model;

public enum UAVMissionStatus {
    REQUESTED,
    EN_ROUTE,
    ON_STATION, // En zona, transmitiendo o listo para atacar
    COMPLETED,
    REJECTED
}
