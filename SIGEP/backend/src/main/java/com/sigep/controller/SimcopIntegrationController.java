package com.sigep.controller;

import com.sigep.model.Soldier;
import com.sigep.model.Transfer;
import com.sigep.repository.SoldierRepository;
import com.sigep.repository.TransferRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/simcop")
public class SimcopIntegrationController {

    @Autowired
    private SoldierRepository soldierRepository;

    @Autowired
    private TransferRepository transferRepository;

    @Autowired
    private com.sigep.service.SimcopSyncService simcopSyncService;

    @GetMapping("/units")
    public ResponseEntity<List<Map<String, Object>>> getSimcopUnits() {
        return ResponseEntity.ok(simcopSyncService.getLiveUnitsFromSimcop());
    }

    @GetMapping("/units/{unitId}/personnel-status")
    public ResponseEntity<Map<String, Object>> getUnitPersonnelStatus(@PathVariable String unitId) {
        List<Soldier> activePersonnel = soldierRepository.findByUnitIdAndStatus(unitId, "ACTIVE");
        List<Transfer> pendingTransfers = transferRepository.findByOriginUnitIdOrDestinationUnitId(unitId, unitId).stream()
                .filter(t -> "PENDING_APPROVAL".equals(t.getStatus()))
                .toList();

        Map<String, Object> response = new HashMap<>();
        response.put("unit_id", unitId);
        response.put("real_personnel_count", activePersonnel.size());
        response.put("personnel", activePersonnel);
        response.put("pending_transfers", pendingTransfers);

        return ResponseEntity.ok(response);
    }
}
