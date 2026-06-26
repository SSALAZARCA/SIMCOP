package com.simcop.controller;

import com.simcop.model.Soldier;
import com.simcop.repository.SoldierRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/soldiers")
public class SoldierController {

    @Autowired
    private SoldierRepository soldierRepository;

    @GetMapping("/search")
    public List<Soldier> searchSoldiers(@RequestParam String q) {
        // Para simplificar la demostración de IA, devolvemos todos y filtramos, o filtramos por nombre/ID
        return soldierRepository.findAll().stream()
                .filter(s -> s.getFullName().toLowerCase().contains(q.toLowerCase()) || 
                             (s.getId() != null && s.getId().toLowerCase().contains(q.toLowerCase())))
                .toList();
    }

    @GetMapping("/{id}/dossier")
    public ResponseEntity<?> getDossier(@PathVariable String id) {
        return soldierRepository.findById(id).map(soldier -> {
            Map<String, Object> dossier = new HashMap<>();
            dossier.put("soldier", soldier);
            // El historial real será consultado de la base de datos de órdenes de traslado
            dossier.put("history", List.of());
            return ResponseEntity.ok(dossier);
        }).orElse(ResponseEntity.notFound().build());
    }
}
