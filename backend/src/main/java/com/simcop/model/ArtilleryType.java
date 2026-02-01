package com.simcop.model;

public enum ArtilleryType {
    HOWITZER_155("Obús 155mm"),
    MLRS("Lanzacohetes Múltiple"),
    HOWITZER_105("Obús 105mm M101A1"),
    HOWITZER_105_LG1("Obús 105mm LG-1 Mk III"),
    HOWITZER_105_L119("Obús 105mm L119"),
    MORTAR_120_M120("Mortero 120mm M120"),
    MORTAR_120_HY112("Mortero 120mm HY1-12");

    private final String label;

    ArtilleryType(String label) {
        this.label = label;
    }

    public String getLabel() {
        return label;
    }
}
