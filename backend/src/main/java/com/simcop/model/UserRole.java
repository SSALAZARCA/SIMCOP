package com.simcop.model;

public enum UserRole {
    ADMINISTRATOR("Administrador del Sistema"),
    COMANDANTE_EJERCITO("Comandante del Ejército"),
    COMANDANTE_DIVISION("Comandante de División"),
    COMANDANTE_BRIGADA("Comandante de Brigada"),
    COMANDANTE_BATALLON("Comandante de Batallón"),
    COMANDANTE_COMPANIA("Comandante de Compañía"),
    COMANDANTE_PELOTON("Comandante de Pelotón"),
    OFICIAL_INTELIGENCIA("Oficial de Inteligencia (B2/G2)"),
    OFICIAL_LOGISTICA("Oficial de Logística"),
    GESTOR_REPORTES("Gestor de Reportes y Novedades"),
    COMANDANTE_PIEZA_ARTILLERIA("Comandante de Pieza de Artillería"),
    COMANDANTE_OBSERVADOR_ADELANTADO("Comandante de Equipo de Observador Adelantado"),
    DIRECTOR_TIRO_155("Director de Tiro - 155mm"),
    DIRECTOR_TIRO_M101A1("Director de Tiro - M101A1"),
    DIRECTOR_TIRO_LG1("Director de Tiro - LG-1 Mk III"),
    DIRECTOR_TIRO_L119("Director de Tiro - L119"),
    DIRECTOR_TIRO_M120("Director de Tiro - M120"),
    DIRECTOR_TIRO_HY112("Director de Tiro - HY1-12"),
    DIRECTOR_TIRO_MLRS("Director de Tiro - MLRS");

    private final String label;

    UserRole(String label) {
        this.label = label;
    }

    public String getLabel() {
        return label;
    }
}
