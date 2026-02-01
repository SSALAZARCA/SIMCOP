package com.simcop.service;

import com.simcop.model.MilitaryUnit;
import com.simcop.model.Soldier;
import com.simcop.repository.MilitaryUnitRepository;
import com.simcop.repository.SoldierRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class SiochInteropService {

    @Autowired
    private MilitaryUnitRepository unitRepository;

    @Autowired
    private SoldierRepository soldierRepository;

    private final RestTemplate restTemplate = new RestTemplate();
    private final String SIOCH_API_BASE_URL = "http://localhost:9090/api/interop"; // Mock URL

    public void sendUnitsBatch() {
        List<MilitaryUnit> units = unitRepository.findAll();
        List<Map<String, Object>> payload = units.stream().map(this::mapUnitToSiochFormat).collect(Collectors.toList());

        try {
            // In a real scenario, we would send this to SIOCH
            // restTemplate.postForObject(SIOCH_API_BASE_URL + "/units/batch", payload,
            // String.class);
            System.out.println("Enviando lote de unidades a SIOCH: " + payload.size() + " unidades.");
            System.out.println("Payload ejemplo: " + (payload.isEmpty() ? "Vacio" : payload.get(0)));
        } catch (Exception e) {
            System.err.println("Error enviando datos a SIOCH: " + e.getMessage());
        }
    }

    public void sendPersonnelBatch() {
        List<Soldier> soldiers = soldierRepository.findAll();
        List<Map<String, Object>> payload = soldiers.stream().map(this::mapSoldierToSiochFormat)
                .collect(Collectors.toList());

        try {
            // restTemplate.postForObject(SIOCH_API_BASE_URL + "/personnel/batch", payload,
            // String.class);
            System.out.println("Enviando lote de personal a SIOCH: " + payload.size() + " efectivos.");
        } catch (Exception e) {
            System.err.println("Error enviando datos a SIOCH: " + e.getMessage());
        }
    }

    private Map<String, Object> mapUnitToSiochFormat(MilitaryUnit unit) {
        Map<String, Object> map = new HashMap<>();
        map.put("name", unit.getName());
        map.put("location", unit.getLocation() != null ? unit.getLocation().toString() : "Desconocida"); // Simplification
        map.put("unitType", unit.getType().toString());
        map.put("operationalStatus", unit.getStatus().toString());
        map.put("publicOrderIndex", unit.getPublicOrderIndex() != null ? unit.getPublicOrderIndex() : 0.5);
        map.put("criticalityLevel", unit.getCriticalityLevel() != null ? unit.getCriticalityLevel() : 1);
        return map;
    }

    private Map<String, Object> mapSoldierToSiochFormat(Soldier soldier) {
        Map<String, Object> map = new HashMap<>();
        map.put("fullName", soldier.getFullName());
        map.put("rank", soldier.getRank());
        map.put("moceCode", soldier.getMoceCode());
        map.put("unitId", soldier.getUnit() != null ? soldier.getUnit().getId() : null);
        map.put("status", soldier.getStatus());
        map.put("healthStatus", soldier.getHealthStatus());
        map.put("legalStatus", soldier.getLegalStatus());
        map.put("timeInPosition", soldier.getTimeInPosition());
        map.put("estimatedRetirementDate", soldier.getEstimatedRetirementDate());
        return map;
    }
}
