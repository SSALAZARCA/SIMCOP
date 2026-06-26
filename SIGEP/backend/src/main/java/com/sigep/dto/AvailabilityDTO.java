package com.sigep.dto;

import lombok.Data;

@Data
public class AvailabilityDTO {
    private int aptos;
    private int noAptos;
    private int excusados;
    private int licencias;
    
    public AvailabilityDTO(int aptos, int noAptos, int excusados, int licencias) {
        this.aptos = aptos;
        this.noAptos = noAptos;
        this.excusados = excusados;
        this.licencias = licencias;
    }
}
