package com.sigep.controller;

import com.sigep.model.Transfer;
import com.sigep.repository.TransferRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/transfers")
public class TransferController {

    @Autowired
    private TransferRepository transferRepository;

    @PostMapping
    public ResponseEntity<?> createTransfer(@RequestBody Transfer transfer) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String username = auth.getName();
        String unitId = (String) auth.getDetails(); // Extracted from JWT
        String role = auth.getAuthorities().iterator().next().getAuthority();

        // Si es Gestor de Batallon, forzamos que el origen sea su propia unidad
        if ("ROLE_BATALLON".equals(role)) {
            transfer.setOriginUnitId(unitId);
        }

        transfer.setStatus("PENDING_APPROVAL");
        transfer.setCreatedBy(username);
        
        Transfer saved = transferRepository.save(transfer);
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
    public ResponseEntity<?> updateStatus(@PathVariable String id, @RequestBody java.util.Map<String, String> body) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String role = auth.getAuthorities().iterator().next().getAuthority();
        
        return transferRepository.findById(id).map(transfer -> {
            String newStatus = body.get("status");
            
            // Reglas de negocio
            if ("APPROVED".equals(newStatus) && !("ROLE_EJERCITO".equals(role) || "ROLE_DIVISION".equals(role))) {
                return ResponseEntity.status(403).body("Solo el Comando Superior puede aprobar traslados.");
            }
            
            transfer.setStatus(newStatus);
            transferRepository.save(transfer);
            return ResponseEntity.ok(transfer);
        }).orElse(ResponseEntity.notFound().build());
    }
}
