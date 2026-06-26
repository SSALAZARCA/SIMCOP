package com.sigep.service;

import com.sigep.dto.AvailabilityDTO;
import com.sigep.dto.ToeBalanceDTO;
import com.sigep.dto.TransferViabilityResult;
import com.sigep.model.Soldier;
import com.sigep.repository.SoldierRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.client.HttpClientErrorException;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class AnalysisService {

    @Autowired
    private SoldierRepository soldierRepository;
    
    @Autowired
    private RestTemplate restTemplate;
    
    private final String SIMCOP_URL = "http://localhost:8080/api/units/";

    public List<ToeBalanceDTO> getToeBalance(String unitId) {
        List<ToeBalanceDTO> result = new ArrayList<>();
        Map<String, Long> countByMos = new java.util.HashMap<>();
        
        // 1. Extraer Soldados Físicos desde SIGEP (Única fuente de verdad de personal real)
        List<Soldier> unitSoldiers = soldierRepository.findAll().stream()
                .filter(s -> s.getUnitId() != null && s.getUnitId().equals(unitId) && s.getStatus().equals("ACTIVE"))
                .collect(Collectors.toList());
                
        for (Soldier soldier : unitSoldiers) {
            String mosCode = soldier.getMosCode();
            if (mosCode == null) mosCode = "SIN ASIGNAR";
            countByMos.put(mosCode, countByMos.getOrDefault(mosCode, 0L) + 1);
        }
        
        // CONEXIÓN REAL A SIMCOP PARA EXTRAER TOE
        try {
            ResponseEntity<Map> response = restTemplate.getForEntity("http://localhost:8080/api/units/" + unitId, Map.class);
            Map<String, Object> body = response.getBody();
            if (body != null && body.containsKey("unit")) {
                Map<String, Object> unitMap = (Map<String, Object>) body.get("unit");

                // 2. Extraer TOE
                Map<String, Object> toeMap = (Map<String, Object>) unitMap.get("toe");
                boolean hasSpecialties = false;
                
                if (toeMap != null && toeMap.containsKey("specialties")) {
                    Map<String, Object> specialtiesMap = (Map<String, Object>) toeMap.get("specialties");
                    List<String> categories = List.of("officers", "ncos", "professionalSoldiers", "regularSoldiers", "civilians");
                    
                    Map<String, Integer> requiredByMos = new java.util.HashMap<>();
                    
                    for (String cat : categories) {
                        List<Map<String, Object>> specs = (List<Map<String, Object>>) specialtiesMap.get(cat);
                        if (specs != null && !specs.isEmpty()) {
                            hasSpecialties = true;
                            for (Map<String, Object> spec : specs) {
                                String mos = (String) spec.get("name");
                                if (mos == null) mos = (String) spec.get("code");
                                int qty = spec.get("quantity") != null ? (Integer) spec.get("quantity") : 0;
                                
                                if (mos != null) {
                                    requiredByMos.put(mos, requiredByMos.getOrDefault(mos, 0) + qty);
                                }
                            }
                        }
                    }
                    
                    if (hasSpecialties) {
                        java.util.Set<String> allMos = new java.util.HashSet<>(countByMos.keySet());
                        allMos.addAll(requiredByMos.keySet());
                        
                        for (String mos : allMos) {
                            int required = requiredByMos.getOrDefault(mos, 0);
                            int actual = countByMos.getOrDefault(mos, 0L).intValue();
                            result.add(new ToeBalanceDTO(unitId, mos, required, actual));
                        }
                        return result;
                    }
                }
                
                // Si no hay especialidades detalladas, usar los totales de authorizedPersonnel
                if (!hasSpecialties && toeMap != null && toeMap.containsKey("authorizedPersonnel")) {
                    Map<String, Integer> auth = (Map<String, Integer>) toeMap.get("authorizedPersonnel");
                    if (auth != null) {
                        int reqOff = auth.get("officers") != null ? auth.get("officers") : 0;
                        int reqNco = auth.get("ncos") != null ? auth.get("ncos") : 0;
                        int reqProf = auth.get("professionalSoldiers") != null ? auth.get("professionalSoldiers") : 0;
                        int reqReg = auth.get("regularSoldiers") != null ? auth.get("regularSoldiers") : 0;
                        int reqCiv = auth.get("civilians") != null ? auth.get("civilians") : 0;
                        
                        // Si hay al menos un requerido o un físico, lo mostramos
                        int actOff = 0, actNco = 0, actProf = 0, actReg = 0, actCiv = 0;
                        
                        // Contar los actuales por categoría basados en los soldados físicos de SIGEP
                        if (unitSoldiers != null) {
                            for (Soldier soldier : unitSoldiers) {
                                String rank = soldier.getRank();
                                if (rank != null) {
                                    rank = rank.toUpperCase();
                                    if (rank.contains("GENERAL") || rank.contains("CORONEL") || rank.contains("MAYOR") || rank.contains("CAPITAN") || rank.contains("TENIENTE")) actOff++;
                                    else if (rank.contains("SARGENTO") || rank.contains("CABO")) actNco++;
                                    else if (rank.contains("PROFESIONAL") || rank.contains("SLP")) actProf++;
                                    else actReg++;
                                } else {
                                    actReg++;
                                }
                            }
                        }
                        
                        result.add(new ToeBalanceDTO(unitId, "OFICIALES", reqOff, actOff));
                        result.add(new ToeBalanceDTO(unitId, "SUBOFICIALES", reqNco, actNco));
                        result.add(new ToeBalanceDTO(unitId, "SLP", reqProf, actProf));
                        result.add(new ToeBalanceDTO(unitId, "SL18", reqReg, actReg));
                        return result;
                    }
                }
            }
        } catch (Exception e) {
            System.err.println("❌ ERROR: No se pudo obtener la TOE real de SIMCOP para la unidad " + unitId + ": " + e.getMessage());
        }

        // Fallback en caso de que SIMCOP no responda o la TOE esté vacía (Datos Reales 0, NO SIMULADOS)
        for (Map.Entry<String, Long> entry : countByMos.entrySet()) {
            result.add(new ToeBalanceDTO(unitId, entry.getKey(), 0, entry.getValue().intValue()));
        }
        
        return result;
    }

    public AvailabilityDTO getAvailability(String unitId) {
        List<Soldier> unitSoldiers = soldierRepository.findAll().stream()
                .filter(s -> s.getUnitId() != null && s.getUnitId().equals(unitId) && s.getStatus().equals("ACTIVE"))
                .collect(Collectors.toList());
                
        int aptos = 0, noAptos = 0, excusados = 0, licencias = 0;
        
        for (Soldier s : unitSoldiers) {
            String hs = s.getHealthStatus();
            if (hs == null) { aptos++; continue; }
            if (hs.equalsIgnoreCase("APTO")) aptos++;
            else if (hs.equalsIgnoreCase("NO APTO") || hs.equalsIgnoreCase("BAJA MEDICA")) noAptos++;
            else if (hs.equalsIgnoreCase("EXCUSA MEDICA")) excusados++;
            else if (hs.equalsIgnoreCase("LICENCIA")) licencias++;
            else aptos++;
        }
        
        return new AvailabilityDTO(aptos, noAptos, excusados, licencias);
    }
    
    public List<Soldier> getCriticalRotation(String unitId) {
        // Retorna soldados con más de 24 meses en la unidad física de SIGEP
        return soldierRepository.findAll().stream()
                .filter(s -> s.getUnitId() != null && s.getUnitId().equals(unitId) && s.getStatus().equals("ACTIVE"))
                .filter(s -> s.getTimeInPosition() != null && s.getTimeInPosition() > 24)
                .collect(Collectors.toList());
    }

    public TransferViabilityResult checkTransferViability(String soldierId, String targetUnitId) {
        TransferViabilityResult result = new TransferViabilityResult();
        result.setViable(true);
        result.setBlockedByToe(false);
        result.setBlockedByOperationalStatus(false);
        result.setMessage("El traslado es viable.");
        result.setSuggestedReplacements(new ArrayList<>());
        
        Soldier s = soldierRepository.findById(soldierId).orElse(null);
        if (s == null) {
            result.setViable(false);
            result.setMessage("Soldado no encontrado.");
            return result;
        }
        
        String sourceUnitId = s.getUnitId();
        String mos = s.getMosCode();
        
        // 1. Validar TOE en la unidad de origen
        List<ToeBalanceDTO> sourceToe = getToeBalance(sourceUnitId);
        ToeBalanceDTO mosToe = sourceToe.stream().filter(t -> t.getMosCode().equals(mos)).findFirst().orElse(null);
        if (mosToe != null) {
            if (mosToe.getActual() - 1 < mosToe.getRequired()) {
                result.setViable(false);
                result.setBlockedByToe(true);
                result.setMessage("BLOQUEO TOE: Al extraer este soldado, la unidad " + sourceUnitId + " quedará en déficit de la especialidad " + mos + " (Requiere " + mosToe.getRequired() + ", Quedarían " + (mosToe.getActual() - 1) + "). Pasa a revisión del G1.");
            }
        }
        
        // 2. Validar Estado Operacional en SIMCOP
        try {
            // Llama a un endpoint nuevo que crearemos en SIMCOP
            ResponseEntity<String> response = restTemplate.getForEntity(SIMCOP_URL + sourceUnitId + "/tactical-status", String.class);
            String status = response.getBody();
            if (status != null && status.contains("COMBATE")) {
                result.setViable(false);
                result.setBlockedByOperationalStatus(true);
                result.setMessage("ALERTA OPERACIONAL: La unidad de origen " + sourceUnitId + " se encuentra actualmente en estado de COMBATE. Se sugiere congelar el traslado. Pasa a revisión del G1.");
            }
        } catch (Exception e) {
            // Si falla la conexión, omitimos por ahora o logueamos
            System.err.println("No se pudo consultar estado táctico de SIMCOP para unidad " + sourceUnitId);
        }
        
        // 3. Si hay bloqueo de TOE, sugerir reemplazos
        if (result.isBlockedByToe()) {
            List<Soldier> potentialReplacements = soldierRepository.findAll().stream()
                .filter(rep -> rep.getMosCode() != null && rep.getMosCode().equals(mos)) // Misma especialidad
                .filter(rep -> rep.getRank() != null && rep.getRank().equals(s.getRank())) // Mismo rango
                .filter(rep -> !rep.getId().equals(soldierId))
                .filter(rep -> rep.getStatus().equals("ACTIVE"))
                .collect(Collectors.toList());
                
            // Filtrar aquellos que provengan de unidades con SUPERAVIT de esa especialidad
            List<Soldier> bestReplacements = new ArrayList<>();
            for (Soldier rep : potentialReplacements) {
                List<ToeBalanceDTO> repUnitToe = getToeBalance(rep.getUnitId());
                ToeBalanceDTO repMosToe = repUnitToe.stream().filter(t -> t.getMosCode().equals(mos)).findFirst().orElse(null);
                if (repMosToe != null && repMosToe.getActual() > repMosToe.getRequired()) {
                    bestReplacements.add(rep);
                }
            }
            result.setSuggestedReplacements(bestReplacements);
            if (!bestReplacements.isEmpty()) {
                result.setMessage(result.getMessage() + " | Se han encontrado " + bestReplacements.size() + " reemplazos idóneos en unidades con superávit.");
            }
        }
        
        return result;
    }
}
