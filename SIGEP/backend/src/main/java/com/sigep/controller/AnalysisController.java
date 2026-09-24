package com.sigep.controller;

import com.sigep.dto.AvailabilityDTO;
import com.sigep.dto.ToeBalanceDTO;
import com.sigep.dto.TransferViabilityResult;
import com.sigep.model.Soldier;
import com.sigep.service.AnalysisService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/analysis")
public class AnalysisController {

    @Autowired
    private AnalysisService analysisService;

    @Autowired
    private com.sigep.security.UnitSecurityService unitSecurityService;

    @GetMapping("/toe-balance/{unitId}")
    public ResponseEntity<List<ToeBalanceDTO>> getToeBalance(@PathVariable String unitId, org.springframework.security.core.Authentication auth) {
        if (auth != null && !unitSecurityService.isUnitAuthorized(auth, unitId)) {
            return ResponseEntity.status(org.springframework.http.HttpStatus.FORBIDDEN).build();
        }
        return ResponseEntity.ok(analysisService.getToeBalance(unitId));
    }

    @GetMapping("/availability/{unitId}")
    public ResponseEntity<AvailabilityDTO> getAvailability(@PathVariable String unitId, org.springframework.security.core.Authentication auth) {
        if (auth != null && !unitSecurityService.isUnitAuthorized(auth, unitId)) {
            return ResponseEntity.status(org.springframework.http.HttpStatus.FORBIDDEN).build();
        }
        return ResponseEntity.ok(analysisService.getAvailability(unitId));
    }

    @GetMapping("/critical-rotation/{unitId}")
    public ResponseEntity<List<Soldier>> getCriticalRotation(@PathVariable String unitId, org.springframework.security.core.Authentication auth) {
        if (auth != null && !unitSecurityService.isUnitAuthorized(auth, unitId)) {
            return ResponseEntity.status(org.springframework.http.HttpStatus.FORBIDDEN).build();
        }
        return ResponseEntity.ok(analysisService.getCriticalRotation(unitId));
    }

    @GetMapping("/viability/{soldierId}/to/{targetUnitId}")
    public ResponseEntity<TransferViabilityResult> checkViability(
            @PathVariable String soldierId,
            @PathVariable String targetUnitId) {
        return ResponseEntity.ok(analysisService.checkTransferViability(soldierId, targetUnitId));
    }
}
