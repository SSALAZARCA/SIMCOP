package com.simcop.controller;

import com.simcop.model.MilitaryUnit;
import com.simcop.model.Soldier;
import com.simcop.repository.MilitaryUnitRepository;
import com.simcop.repository.SoldierRepository;
import com.simcop.service.SoldierService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/webhooks")
public class WebhookController {

    private static final Logger logger = LoggerFactory.getLogger(WebhookController.class);

    @Autowired
    private SoldierRepository soldierRepository;

    @Autowired
    private MilitaryUnitRepository unitRepository;

    @Autowired
    private SoldierService soldierService;

    @PostMapping("/personnel/transfer-completed")
    public ResponseEntity<String> handleTransferCompleted(@RequestBody Map<String, Object> payload) {
        logger.info("Recibido Webhook de SIGEP: Traslado Completado");
        
        try {
            Map<String, Object> eventPayload = (Map<String, Object>) payload.get("payload");
            if (eventPayload == null) {
                return ResponseEntity.badRequest().body("Payload is missing");
            }

            String soldierId = (String) eventPayload.get("soldier_id");
            String targetUnitId = (String) eventPayload.get("target_unit_id");

            logger.info("Procesando traslado del Soldado [{}] hacia la Unidad [{}]", soldierId, targetUnitId);

            Optional<Soldier> soldierOpt = soldierRepository.findById(soldierId);
            if (soldierOpt.isPresent()) {
                // El soldado existe en SIMCOP, actualizamos su unidad
                Soldier soldier = soldierOpt.get();
                
                // Disminuir contador de unidad original si tenía una
                if (soldier.getUnit() != null) {
                    soldierService.deleteSoldier(soldierId); // Delete will decrement properly
                    
                    // Re-create the soldier in the new unit to ensure counters increment properly
                    soldier.setId(soldierId); // keep same ID
                    soldierService.createSoldier(soldier, targetUnitId);
                } else {
                    // Update normally
                    Optional<MilitaryUnit> newUnit = unitRepository.findById(targetUnitId);
                    if(newUnit.isPresent()){
                         soldier.setUnit(newUnit.get());
                         soldierRepository.save(soldier);
                    }
                }
                
                logger.info("Traslado sincronizado en SIMCOP exitosamente.");
            } else {
                logger.warn("Soldado [{}] no encontrado en SIMCOP. Registrándolo de cero desde SIGEP.", soldierId);
                // Si no existe, lo creamos de cero usando los datos del payload
                Soldier newSoldier = new Soldier();
                newSoldier.setId(soldierId);
                newSoldier.setFullName((String) eventPayload.get("name"));
                newSoldier.setRank((String) eventPayload.get("rank"));
                newSoldier.setMoceCode((String) eventPayload.get("mos_code"));
                newSoldier.setStatus("ACTIVE");
                
                soldierService.createSoldier(newSoldier, targetUnitId);
            }

            return ResponseEntity.ok("Transfer synced successfully in SIMCOP");

        } catch (Exception e) {
            logger.error("Error al procesar Webhook de SIGEP: ", e);
            return ResponseEntity.internalServerError().body("Error processing transfer");
        }
    }
}
