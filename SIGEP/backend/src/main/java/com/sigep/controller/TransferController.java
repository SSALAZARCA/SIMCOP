package com.sigep.controller;

import com.sigep.model.Transfer;
import com.sigep.repository.TransferRepository;
import com.sigep.service.TransferService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/transfers")
public class TransferController {

    @Autowired
    private TransferService transferService;

    @Autowired
    private TransferRepository transferRepository;

    @PostMapping
    public ResponseEntity<?> createTransfer(@RequestBody Transfer transfer) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String username = auth.getName();
        String unitId = (String) auth.getDetails(); // Extracted from JWT
        String role = auth.getAuthorities().iterator().next().getAuthority();

        Transfer saved = transferService.createTransfer(transfer, username, unitId, role);
        return ResponseEntity.ok(saved);
    }

    @GetMapping
    public ResponseEntity<List<Transfer>> getTransfers(@RequestParam(required = false) String rankCategory) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String unitId = (String) auth.getDetails();
        String role = auth.getAuthorities().iterator().next().getAuthority();

        List<Transfer> transfers;
        if ("ROLE_EJERCITO".equals(role)) {
            transfers = rankCategory != null ? transferRepository.findByRankCategory(rankCategory) : transferRepository.findAll();
        } else {
            // Filtrar por unidad del usuario (ya sea como origen o como destino)
            transfers = transferRepository.findByOriginUnitIdOrDestinationUnitId(unitId, unitId);
            if (rankCategory != null) {
                transfers = transfers.stream().filter(t -> rankCategory.equals(t.getRankCategory())).collect(Collectors.toList());
            }
        }
        return ResponseEntity.ok(transfers);
    }

    @PutMapping("/{id}/status")
    public ResponseEntity<?> updateStatus(@PathVariable String id, @RequestBody Map<String, String> body) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String role = auth.getAuthorities().iterator().next().getAuthority();
        String username = auth.getName();
        String newStatus = body.get("status");

        try {
            Transfer updated = transferService.updateTransferStatus(id, newStatus, username, role);
            return ResponseEntity.ok(updated);
        } catch (SecurityException se) {
            return ResponseEntity.status(403).body(se.getMessage());
        } catch (IllegalArgumentException iae) {
            return ResponseEntity.notFound().build();
        }
    }
}
