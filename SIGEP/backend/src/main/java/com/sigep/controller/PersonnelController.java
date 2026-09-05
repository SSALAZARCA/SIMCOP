package com.sigep.controller;

import com.sigep.model.Soldier;
import com.sigep.repository.SoldierRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.time.LocalDateTime;
import java.util.UUID;
import com.sigep.model.Novedad;
import com.sigep.repository.NovedadRepository;

@RestController
@RequestMapping("/api/personnel")
public class PersonnelController {

    @Autowired
    private SoldierRepository soldierRepository;

    @Autowired
    private NovedadRepository novedadRepository;

    @GetMapping
    public List<Soldier> getAll() {
        return soldierRepository.findAll();
    }
    
    @GetMapping("/unit/{unitId}")
    public List<Soldier> getByUnit(@PathVariable String unitId) {
        return soldierRepository.findAll().stream()
            .filter(s -> unitId.equals(s.getUnitId()))
            .toList();
    }

    @PostMapping
    public ResponseEntity<Soldier> create(@RequestBody Soldier soldier) {
        if (soldier.getId() == null || soldier.getId().isEmpty()) {
            soldier.setId(UUID.randomUUID().toString());
        }
        if (soldier.getStatus() == null) soldier.setStatus("ACTIVE");
        if (soldier.getAssignmentDate() == null) soldier.setAssignmentDate(java.time.LocalDate.now());
        return ResponseEntity.ok(soldierRepository.save(soldier));
    }
    
    @Transactional
    @PostMapping("/novedades")
    public ResponseEntity<Novedad> registerNovedad(@RequestBody Novedad novedad) {
        novedad.setFecha(LocalDateTime.now());
        
        // Logica para aplicar la novedad al soldado (ej. si es BAJA, cambiar status)
        soldierRepository.findById(novedad.getSoldierId()).ifPresent(soldier -> {
            if ("BAJA".equals(novedad.getTipo()) || "TRASLADO".equals(novedad.getTipo())) {
                soldier.setStatus("INACTIVE");
            } else if ("LICENCIA_MEDICA".equals(novedad.getTipo())) {
                soldier.setHealthStatus("EXCUSA MEDICA");
            }
            soldierRepository.save(soldier);
        });
        
        return ResponseEntity.ok(novedadRepository.save(novedad));
    }
    
    @GetMapping("/unit/{unitId}/novedades")
    public ResponseEntity<List<Novedad>> getUnitNovedades(@PathVariable String unitId) {
        return ResponseEntity.ok(novedadRepository.findByUnitIdOrderByFechaDesc(unitId));
    }
}
