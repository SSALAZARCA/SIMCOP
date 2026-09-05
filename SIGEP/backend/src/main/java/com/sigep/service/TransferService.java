package com.sigep.service;

import com.sigep.model.Novedad;
import com.sigep.model.Soldier;
import com.sigep.model.Transfer;
import com.sigep.repository.NovedadRepository;
import com.sigep.repository.SoldierRepository;
import com.sigep.repository.TransferRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;

@Service
@Transactional(readOnly = true)
public class TransferService {

    @Autowired
    private TransferRepository transferRepository;

    @Autowired
    private SoldierRepository soldierRepository;

    @Autowired
    private NovedadRepository novedadRepository;

    @Transactional
    public Transfer createTransfer(Transfer transfer, String username, String unitId, String role) {
        // Si es Gestor de Batallón, el origen debe ser su unidad asignada
        if ("ROLE_BATALLON".equals(role)) {
            transfer.setOriginUnitId(unitId);
        }

        transfer.setStatus("PENDING_APPROVAL");
        transfer.setCreatedBy(username);

        return transferRepository.save(transfer);
    }

    @Transactional
    public Transfer updateTransferStatus(String transferId, String newStatus, String username, String role) {
        Transfer transfer = transferRepository.findById(transferId)
                .orElseThrow(() -> new IllegalArgumentException("Traslado no encontrado con ID: " + transferId));

        // Reglas de autorización para aprobación
        if ("APPROVED".equals(newStatus) && !("ROLE_EJERCITO".equals(role) || "ROLE_DIVISION".equals(role) || "ROLE_ADMINISTRATOR".equals(role))) {
            throw new SecurityException("Solo el Comando Superior puede aprobar traslados.");
        }

        if ("APPROVED".equals(newStatus)) {
            // Reasignación orgánica del efectivo militar
            if (transfer.getSoldierId() != null) {
                soldierRepository.findById(transfer.getSoldierId()).ifPresent(soldier -> {
                    if (soldier.getUnitHistory() == null) {
                        soldier.setUnitHistory(new ArrayList<>());
                    }
                    if (transfer.getOriginUnitId() != null) {
                        soldier.getUnitHistory().add(transfer.getOriginUnitId());
                    }
                    soldier.setUnitId(transfer.getDestinationUnitId());
                    soldier.setAssignmentDate(LocalDate.now());
                    soldierRepository.save(soldier);
                });
            }

            // Auditoría forense de la novedad del traslado
            Novedad novedad = new Novedad();
            novedad.setSoldierId(transfer.getSoldierId());
            novedad.setUnitId(transfer.getDestinationUnitId());
            novedad.setTipo("TRASLADO");
            novedad.setFecha(LocalDateTime.now());
            novedad.setDescripcion("Traslado orgánico aprobado desde unidad " + transfer.getOriginUnitId() + 
                    " hacia unidad " + transfer.getDestinationUnitId() + " por " + username);
            novedad.setRegistradoPor(username);
            novedadRepository.save(novedad);
        }

        transfer.setStatus(newStatus);
        return transferRepository.save(transfer);
    }
}
