package com.simcop.model;

public enum AlertType {
    NO_MOVEMENT("Sin Movimiento"),
    DANGEROUS_ROUTINE("Rutina Peligrosa"),
    HIGH_PRIORITY_INTEL("Inteligencia Alta Prioridad"),
    LOW_LOGISTICS("Logística Baja"),
    UNIT_IN_FORBIDDEN_ZONE("Unidad en Zona Prohibida"),
    COMMUNICATION_LOST("Pérdida Comunicación General"),
    HOURLY_REPORT_MISSED("Reporte Horario Omitido"),
    UNIT_ENGAGED("Unidad en Combate"),
    INFO("Información"),
    Q5_GENERATED("Reporte Q5 Generado"),
    Q5_GENERATION_FAILED("Fallo Generación Reporte Q5"),
    Q5_TELEGRAM_SENT("Reporte Q5 Enviado a Telegram"),
    Q5_TELEGRAM_FAILED("Fallo Envío Q5 a Telegram"),
    UNIT_TO_RETRAINING("Unidad a Permiso/Reentrenamiento"),
    UNIT_RETURNED_FROM_RETRAINING("Unidad Reintegrada de Permiso/Reentrenamiento"),
    UNIT_LEAVE_STARTED("Permiso Iniciado para Unidad"),
    UNIT_RETRAINING_STARTED("Reentrenamiento Iniciado para Unidad"),
    SPOT_REPORT_RECEIVED("Reporte SPOT Recibido"),
    ORDOP_CREATED("Orden de Operaciones Creada"),
    ORDOP_PUBLISHED("Orden de Operaciones Publicada"),
    ORDOP_UPDATED("Orden de Operaciones Actualizada"),
    ORDOP_ACKNOWLEDGED("Orden de Operaciones Recibida"),
    AMMO_REPORT_PENDING("Reporte de Munición Pendiente Aprobación"),
    AMMO_REPORT_APPROVED("Reporte de Munición Aprobado"),
    AMMO_REPORT_REJECTED("Reporte de Munición Rechazado"),
    USER_LOGIN_SUCCESS("Inicio de Sesión Exitoso"),
    USER_LOGIN_FAILED("Inicio de Sesión Fallido"),
    USER_LOGOUT("Cierre de Sesión"),
    USER_CREATED("Usuario Creado"),
    USER_UPDATED("Usuario Actualizado"),
    USER_DELETED("Usuario Eliminado"),
    USER_ACTION_FAILED("Acción de Usuario Fallida"),
    ORGANIZATION_UNIT_CREATED("Unidad Organizacional Creada"),
    ORGANIZATION_UNIT_UPDATED("Unidad Organizacional Actualizada"),
    ORGANIZATION_UNIT_DELETED("Unidad Organizacional Eliminada"),
    COMMANDER_ASSIGNED("Comandante Asignado a Unidad Org."),
    FIRE_MISSION_REQUESTED("Solicitud de Misión de Fuego Recibida"),
    FIRE_MISSION_START("Misión de Fuego Iniciada"),
    FIRE_MISSION_COMPLETE("Misión de Fuego Completada"),
    ARTILLERY_PIECE_CREATED("Pieza de Artillería Creada"),
    FORWARD_OBSERVER_CREATED("Observador Adelantado Creado"),
    PLATOON_NOVELTY_PENDING("Novedad de Pelotón Pendiente Aprobación"),
    PLATOON_NOVELTY_REJECTED("Novedad de Pelotón Rechazada"),
    LOGISTICS_REQUEST_PENDING("Requerimiento Logístico Pendiente"),
    LOGISTICS_REQUEST_FULFILLED("Requerimiento Logístico Satisfecho"),
    BMA_HOTSPOT_THREAT("Amenaza BMA: Unidad en Punto Crítico");

    private final String label;

    AlertType(String label) {
        this.label = label;
    }

    public String getLabel() {
        return label;
    }
}
