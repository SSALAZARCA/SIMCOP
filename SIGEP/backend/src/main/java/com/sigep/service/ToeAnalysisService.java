package com.sigep.service;

import com.sigep.model.Soldier;
import com.sigep.repository.SoldierRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;

@Service
public class ToeAnalysisService {

    @Autowired
    private SoldierRepository soldierRepository;

    // TOE Ideal (En un sistema real esto viene sincronizado de SIMCOP, lo simulamos para el motor analítico)
    private final Map<String, Integer> REQUIRED_MOS_CAPACITY = Map.of(
            "MOS_11B_INF", 100,  // Infantería
            "MOS_68W_MED", 10,   // Paramédicos de Combate
            "MOS_19D_CAV", 20    // Exploradores de Caballería
    );

    public boolean validateTransferImpact(String unitId, String mosCode) {
        if (mosCode == null || !REQUIRED_MOS_CAPACITY.containsKey(mosCode)) {
            return true; // No es MOS crítico
        }

        List<Soldier> activeSoldiers = soldierRepository.findByUnitIdAndStatus(unitId, "ACTIVE");
        long currentMosCount = activeSoldiers.stream()
                .filter(s -> mosCode.equals(s.getMosCode()))
                .count();

        int required = REQUIRED_MOS_CAPACITY.get(mosCode);
        
        // Si al quitar uno, cae por debajo del 80% del TOE ideal, alerta.
        double capacityAfterTransfer = (double) (currentMosCount - 1) / required;
        
        return capacityAfterTransfer >= 0.8;
    }
}
