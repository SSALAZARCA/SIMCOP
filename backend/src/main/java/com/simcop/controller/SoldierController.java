package com.simcop.controller;

import com.simcop.model.Soldier;
import com.simcop.service.SoldierService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/soldiers")
@CrossOrigin(origins = "*", allowedHeaders = "*", methods = { RequestMethod.GET, RequestMethod.POST, RequestMethod.PUT,
        RequestMethod.DELETE })
public class SoldierController {

    @Autowired
    private SoldierService soldierService;

    @GetMapping
    public List<Soldier> getAllSoldiers() {
        return soldierService.getAllSoldiers();
    }

    @GetMapping("/{id}")
    public ResponseEntity<Soldier> getSoldierById(@PathVariable String id) {
        return soldierService.getSoldierById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/unit/{unitId}")
    public List<Soldier> getSoldiersByUnit(@PathVariable String unitId) {
        return soldierService.getSoldiersByUnit(unitId);
    }

    @PostMapping
    public ResponseEntity<Soldier> createSoldier(@RequestBody Soldier soldier,
            @RequestParam(required = false) String unitId) {
        try {
            return ResponseEntity.ok(soldierService.createSoldier(soldier, unitId));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().build();
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<Soldier> updateSoldier(@PathVariable String id, @RequestBody Soldier soldier) {
        try {
            return ResponseEntity.ok(soldierService.updateSoldier(id, soldier));
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteSoldier(@PathVariable String id) {
        soldierService.deleteSoldier(id);
        return ResponseEntity.noContent().build();
    }
}
