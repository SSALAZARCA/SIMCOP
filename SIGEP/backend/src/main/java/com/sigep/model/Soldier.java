package com.sigep.model;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Data;

@Entity
@Table(name = "personnel")
@Data
public class Soldier {
    
    @Id
    private String id;
    
    private String name;
    private String rank;
    private String mosCode;
    private String unitId;
    private String joinDate;
    private String status = "ACTIVE"; // ACTIVE, IN_TRANSIT
    
    // Campos para IA y Hoja de Vida
    private String healthStatus;
    private String cursosCombate;
    private Integer timeInPosition; // Meses en la unidad (puede ser calculado o manual)
    
    // Campos nuevos para Ficha Digital Robusta
    private String branch; // Arma (Ej. Infantería, Caballería)
    private java.time.LocalDate assignmentDate; // Para calcular permanencia inmutablemente
    
    @jakarta.persistence.ElementCollection
    @jakarta.persistence.CollectionTable(name = "soldier_history", joinColumns = @jakarta.persistence.JoinColumn(name = "soldier_id"))
    @jakarta.persistence.Column(name = "unit_id")
    private java.util.List<String> unitHistory = new java.util.ArrayList<>();
}
