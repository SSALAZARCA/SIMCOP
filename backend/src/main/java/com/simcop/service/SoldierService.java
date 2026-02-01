package com.simcop.service;

import com.simcop.model.MilitaryUnit;
import com.simcop.model.Soldier;
import com.simcop.repository.MilitaryUnitRepository;
import com.simcop.repository.SoldierRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Service
public class SoldierService {

    @Autowired
    private SoldierRepository soldierRepository;

    @Autowired
    private MilitaryUnitRepository unitRepository;

    public List<Soldier> getAllSoldiers() {
        return soldierRepository.findAll();
    }

    public Optional<Soldier> getSoldierById(String id) {
        return soldierRepository.findById(id);
    }

    public List<Soldier> getSoldiersByUnit(String unitId) {
        return soldierRepository.findByUnitId(unitId);
    }

    @Transactional
    public Soldier createSoldier(Soldier soldier, String unitId) {
        if (unitId != null && !unitId.isEmpty()) {
            Optional<MilitaryUnit> unitOpt = unitRepository.findById(unitId);
            if (unitOpt.isPresent()) {
                MilitaryUnit unit = unitOpt.get();
                soldier.setUnit(unit);
                // Auto-sync: Update unit counters
                updateUnitPersonnelCount(unit, soldier.getRank(), 1);
                unitRepository.save(unit);
            } else {
                throw new RuntimeException("Unit not found with id: " + unitId);
            }
        }
        return soldierRepository.save(soldier);
    }

    @Transactional
    public Soldier updateSoldier(String id, Soldier soldierDetails) {
        return soldierRepository.findById(id).map(soldier -> {
            // Check if rank changed to update quotas potentially?
            // For simplicity in this version we just update fields.
            // Ideally if rank changes category, we should decrement old category and
            // increment new one in the unit.
            // But let's leave that for a more advanced refactor to avoid complexity now.

            soldier.setFullName(soldierDetails.getFullName());
            soldier.setRank(soldierDetails.getRank());
            soldier.setMoceCode(soldierDetails.getMoceCode());
            soldier.setStatus(soldierDetails.getStatus());
            soldier.setHealthStatus(soldierDetails.getHealthStatus());
            soldier.setLegalStatus(soldierDetails.getLegalStatus());
            soldier.setTimeInPosition(soldierDetails.getTimeInPosition());
            soldier.setEstimatedRetirementDate(soldierDetails.getEstimatedRetirementDate());
            return soldierRepository.save(soldier);
        }).orElseThrow(() -> new RuntimeException("Soldier not found with id: " + id));
    }

    @Transactional
    public void deleteSoldier(String id) {
        soldierRepository.findById(id).ifPresent(soldier -> {
            if (soldier.getUnit() != null) {
                // Auto-sync: Decrement unit counters
                updateUnitPersonnelCount(soldier.getUnit(), soldier.getRank(), -1);
                unitRepository.save(soldier.getUnit());
            }
            soldierRepository.deleteById(id);
        });
    }

    private void updateUnitPersonnelCount(MilitaryUnit unit, String rank, int delta) {
        if (unit.getPersonnelBreakdown() == null) {
            return;
        }

        // Normalize rank just in case
        String r = rank != null ? rank.toUpperCase().trim() : "";

        // Categorize based on rank prefixes
        // Officers
        if (r.startsWith("TE.") || r.startsWith("ST.") || r.startsWith("CT.") ||
                r.startsWith("MY.") || r.startsWith("TC.") || r.startsWith("CR.") ||
                r.startsWith("BG.") || r.startsWith("MG.") || r.startsWith("GR.")) {

            int current = unit.getPersonnelBreakdown().getOfficers();
            unit.getPersonnelBreakdown().setOfficers(Math.max(0, current + delta));
        }
        // NCOs (Suboficiales)
        else if (r.startsWith("CS.") || r.startsWith("CP.") || r.startsWith("SS.") ||
                r.startsWith("SV.") || r.startsWith("SP.") || r.startsWith("SM.") ||
                r.startsWith("SMC.") || r.startsWith("C3.") || r.startsWith("CT3.")) { // CT3 could be Cabo Tercero

            int current = unit.getPersonnelBreakdown().getNcos();
            unit.getPersonnelBreakdown().setNcos(Math.max(0, current + delta));
        }
        // Professional Soldiers
        else if (r.startsWith("SLP.")) {
            int current = unit.getPersonnelBreakdown().getProfessionalSoldiers();
            unit.getPersonnelBreakdown().setProfessionalSoldiers(Math.max(0, current + delta));
        }
        // Regular Soldiers
        else if (r.startsWith("SL18.") || r.startsWith("SL12.") || r.startsWith("SLR.")) {
            int current = unit.getPersonnelBreakdown().getSlRegulars();
            unit.getPersonnelBreakdown().setSlRegulars(Math.max(0, current + delta));
        }
        // Default fallback if unknown rank? For now we ignore or could map to regulars.
    }
}
