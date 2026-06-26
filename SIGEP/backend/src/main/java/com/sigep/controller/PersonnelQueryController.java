package com.sigep.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import com.sigep.repository.SoldierRepository;
import com.sigep.repository.NovedadRepository;
import com.sigep.model.Soldier;
import com.sigep.model.Novedad;

import java.util.List;
import java.util.Map;
import java.util.HashMap;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/personnel")
public class PersonnelQueryController {

    @Autowired
    private SoldierRepository soldierRepository;

    @Autowired
    private NovedadRepository novedadRepository;

    @GetMapping("/search")
    public ResponseEntity<?> searchPersonnel(@RequestParam String query) {
        String q = query.toLowerCase();
        List<Soldier> results = soldierRepository.findAll().stream()
            .filter(s -> (s.getId() != null && s.getId().toLowerCase().contains(q)) || 
                         (s.getName() != null && s.getName().toLowerCase().contains(q)) ||
                         (s.getMosCode() != null && s.getMosCode().toLowerCase().contains(q)))
            .collect(Collectors.toList());
            
        return ResponseEntity.ok(results);
    }

    @GetMapping("/{id}/dossier")
    public ResponseEntity<?> getDossier(@PathVariable String id) {
        return soldierRepository.findById(id).map(soldier -> {
            Map<String, Object> dossier = new HashMap<>();
            dossier.put("soldier", soldier);
            
            List<Novedad> novedades = novedadRepository.findBySoldierIdOrderByFechaDesc(id);
            dossier.put("history", novedades);
            
            // Si el soldado tiene unitHistory (lista simple de strings), lo añadimos
            dossier.put("unitHistory", soldier.getUnitHistory());
            
            return ResponseEntity.ok(dossier);
        }).orElse(ResponseEntity.notFound().build());
    }
}
