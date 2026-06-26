package com.sigep.model;

import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDateTime;

@Entity
@Table(name = "novedades")
@Data
public class Novedad {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    private String soldierId;
    private String unitId;
    
    // Tipos: ALTA, BAJA, PERMISO, VACACIONES, LICENCIA_MEDICA, SANCION_DISCIPLINARIA, TRASLADO
    private String tipo;
    
    private LocalDateTime fecha;
    
    @Column(length = 1000)
    private String descripcion;
    
    private String registradoPor;
}
