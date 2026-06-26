package com.simcop.controller;

import com.simcop.model.MilitaryUnit;
import com.simcop.repository.MilitaryUnitRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/units")
@CrossOrigin(origins = "*")
public class TacticalStatusController {

    @Autowired
    private MilitaryUnitRepository militaryUnitRepository;

    @GetMapping("/{unitId}/tactical-status")
    public ResponseEntity<String> getTacticalStatus(@PathVariable String unitId) {
        MilitaryUnit unit = militaryUnitRepository.findById(unitId).orElse(null);
        if (unit != null && unit.getStatus() != null) {
            return ResponseEntity.ok(unit.getStatus().toString());
        }
        return ResponseEntity.ok("OPERATIONAL"); // Default
    }
}
