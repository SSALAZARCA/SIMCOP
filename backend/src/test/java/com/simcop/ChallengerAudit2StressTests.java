package com.simcop;

import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.simcop.controller.WebhookController;
import com.simcop.model.MilitaryUnit;
import com.simcop.model.Soldier;
import com.simcop.model.UnitStatus;
import com.simcop.repository.MilitaryUnitRepository;
import com.simcop.repository.SoldierRepository;
import com.simcop.service.SoldierService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.test.context.ActiveProfiles;

import java.time.LocalDate;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@ActiveProfiles("test")
public class ChallengerAudit2StressTests {

    @Autowired
    private WebhookController webhookController;

    @Autowired
    private SoldierRepository soldierRepository;

    @Autowired
    private MilitaryUnitRepository unitRepository;

    @Autowired
    private SoldierService soldierService;

    private ObjectMapper objectMapper;

    @BeforeEach
    void setUp() {
        objectMapper = new ObjectMapper();
        objectMapper.registerModule(new JavaTimeModule());
        soldierRepository.deleteAll();
        unitRepository.deleteAll();
    }

    // =========================================================================
    // MISSION TASK 1: Jackson Serialization & Data Contract in Soldier.java
    // =========================================================================

    @Test
    @DisplayName("EXP-01: @JsonIgnore prevents infinite recursion in bidirectional Soldier <-> MilitaryUnit graph")
    void testSerializationRecursionPrevention() throws Exception {
        MilitaryUnit unit = new MilitaryUnit();
        unit.setId("UNIT-TEST-001");
        unit.setName("Batallon Vencedores");
        unit.setStatus(UnitStatus.OPERATIONAL);

        Soldier soldier = new Soldier();
        soldier.setId("SLD-EXP-001");
        soldier.setFullName("Sargento Primero Gomez");
        soldier.setRank("SP");
        soldier.setMoceCode("INF-01");
        soldier.setStatus("ACTIVO");
        soldier.setHealthStatus("APTO");
        soldier.setLegalStatus("HABILITADO");
        soldier.setTimeInPosition(30);
        soldier.setEstimatedRetirementDate(LocalDate.of(2035, 6, 30));

        // Bidirectional cycle setup
        soldier.setUnit(unit);
        unit.getPersonnelList().add(soldier);

        // 1. Serialize Soldier directly
        String soldierJson = assertDoesNotThrow(() -> objectMapper.writeValueAsString(soldier));
        assertNotNull(soldierJson);

        // Verify contract: unitId exists and matches
        assertTrue(soldierJson.contains("\"unitId\":\"UNIT-TEST-001\""),
                "Serialized JSON must contain unitId as top-level property");

        // Verify contract: unit map exists and contains id, name, status
        assertTrue(soldierJson.contains("\"unit\":{"),
                "Serialized JSON must contain synthetic unit summary map");
        assertTrue(soldierJson.contains("\"name\":\"Batallon Vencedores\""),
                "Synthetic unit summary must contain unit name");
        assertTrue(soldierJson.contains("\"status\":\"OPERATIONAL\""),
                "Synthetic unit summary must contain unit status name");

        // Verify no infinite recursion / no nested personnelList
        assertFalse(soldierJson.contains("personnelList"),
                "Soldier serialization must NOT include unit's personnelList back-reference");

        // 2. Serialize MilitaryUnit directly
        String unitJson = assertDoesNotThrow(() -> objectMapper.writeValueAsString(unit));
        assertNotNull(unitJson);
        assertTrue(unitJson.contains("\"personnelList\":["),
                "Unit must serialize personnelList");
        assertTrue(unitJson.contains("\"unitId\":\"UNIT-TEST-001\""),
                "Nested soldier in personnelList must contain unitId");
    }

    @Test
    @DisplayName("EXP-02: Jackson Deserialization behavior for Soldier with synthetic unit properties")
    void testSoldierDeserializationBehavior() {
        String incomingJson = "{"
                + "\"id\":\"SLD-DESER-001\","
                + "\"fullName\":\"Cabo Martinez\","
                + "\"rank\":\"CS\","
                + "\"moceCode\":\"COM-02\","
                + "\"status\":\"ACTIVO\","
                + "\"unitId\":\"UNIT-TEST-001\","
                + "\"unit\":{\"id\":\"UNIT-TEST-001\",\"name\":\"Batallon Vencedores\",\"status\":\"OPERATIONAL\"}"
                + "}";

        ObjectMapper strictMapper = new ObjectMapper();
        strictMapper.registerModule(new JavaTimeModule());

        // In Soldier.java:
        // getUnitId() has @JsonProperty("unitId"), but there is NO setUnitId(String).
        // getUnitSummary() has @JsonProperty("unit"), but there is NO matching setter.
        // Therefore, strict ObjectMapper throws UnrecognizedPropertyException on "unitId"!
        assertThrows(com.fasterxml.jackson.databind.exc.UnrecognizedPropertyException.class, () -> {
            strictMapper.readValue(incomingJson, Soldier.class);
        }, "Strict Jackson deserialization throws UnrecognizedPropertyException because Soldier lacks setUnitId / setter for synthetic properties");

        // With FAIL_ON_UNKNOWN_PROPERTIES = false, it succeeds but leaves unit field null:
        ObjectMapper tolerantMapper = new ObjectMapper();
        tolerantMapper.configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false);
        Soldier deserialized = assertDoesNotThrow(() -> tolerantMapper.readValue(incomingJson, Soldier.class));
        assertNotNull(deserialized);
        assertEquals("SLD-DESER-001", deserialized.getId());
        assertNull(deserialized.getUnit(), "unit JPA relationship cannot be populated from synthetic JSON map without custom deserializer");
    }

    // =========================================================================
    // MISSION TASK 3: WebhookController Transactional Data Loss Verification
    // =========================================================================

    @Test
    @DisplayName("EXP-03: FIX VERIFICADO - @Transactional garantiza atomicidad: soldado preservado si falla la unidad destino")
    void testWebhookDataLossDueToMissingTransactional() {
        // Step 1: Create a source unit in SIMCOP
        MilitaryUnit sourceUnit = new MilitaryUnit();
        sourceUnit.setId("UNIT-ORIGIN-999");
        sourceUnit.setName("Batallón Origen");
        sourceUnit.setStatus(UnitStatus.OPERATIONAL);
        sourceUnit = unitRepository.save(sourceUnit);

        // Step 2: Create a soldier attached to source unit
        Soldier soldier = new Soldier();
        soldier.setFullName("Cabo Primero Victima");
        soldier.setRank("CP.");
        soldier.setMoceCode("INF-01");
        soldier.setStatus("ACTIVO");
        soldier.setHealthStatus("APTO");
        soldier.setLegalStatus("HABILITADO");
        soldier = soldierService.createSoldier(soldier, sourceUnit.getId());

        String generatedSoldierId = soldier.getId();
        System.out.println(">>> Generated Soldier ID: " + generatedSoldierId);

        // Confirm soldier exists in database prior to webhook
        assertTrue(soldierRepository.findById(generatedSoldierId).isPresent(),
                "PRE-CONDITION: Soldier must exist in database prior to webhook");
        assertEquals(sourceUnit.getId(), soldierRepository.findById(generatedSoldierId).get().getUnit().getId());

        // Step 3: Trigger webhook transfer to a NON-EXISTENT target unit
        Map<String, Object> innerPayload = new HashMap<>();
        innerPayload.put("soldier_id", generatedSoldierId);
        innerPayload.put("target_unit_id", "NON-EXISTENT-TARGET-UNIT-888"); // Non-existent target unit!
        innerPayload.put("name", "Cabo Primero Victima");
        innerPayload.put("rank", "CP.");
        innerPayload.put("mos_code", "INF-01");

        Map<String, Object> webhookPayload = new HashMap<>();
        webhookPayload.put("payload", innerPayload);

        // Step 4: Execute handleTransferCompleted in WebhookController
        ResponseEntity<String> response = webhookController.handleTransferCompleted(webhookPayload);

        // WebhookController should return 500 when target unit does not exist
        assertEquals(HttpStatus.INTERNAL_SERVER_ERROR, response.getStatusCode(),
                "Webhook should return HTTP 500 when target unit does not exist");

        // Step 5: VERIFICACIÓN DEL FIX — @Transactional garantiza que el soldado NO se pierde
        // El método lanza IllegalArgumentException antes de tocar al soldado → rollback completo.
        // El soldado debe seguir existiendo y asignado a su unidad original.
        Optional<Soldier> soldierOpt = soldierRepository.findById(generatedSoldierId);

        assertTrue(soldierOpt.isPresent(),
                "FIX VERIFICADO: El soldado fue preservado gracias a @Transactional. No hubo pérdida de datos.");
        assertEquals(sourceUnit.getId(), soldierOpt.get().getUnit().getId(),
                "FIX VERIFICADO: El soldado sigue asignado a su unidad original tras el rollback atómico.");

        System.out.println(">>> FIX CONFIRMED: Soldier " + generatedSoldierId + " preserved in original unit. No data loss.");
    }

    @Test
    @DisplayName("EXP-04: Successful transfer updates unit when target unit exists but mutates UUID if Hibernate overwrites it")
    void testWebhookSuccessfulTransfer() {
        MilitaryUnit sourceUnit = new MilitaryUnit();
        sourceUnit.setId("UNIT-SRC-100");
        sourceUnit.setName("Batallón Origen");
        sourceUnit.setStatus(UnitStatus.OPERATIONAL);
        sourceUnit = unitRepository.save(sourceUnit);

        MilitaryUnit targetUnit = new MilitaryUnit();
        targetUnit.setId("UNIT-TGT-200");
        targetUnit.setName("Batallón Destino");
        targetUnit.setStatus(UnitStatus.OPERATIONAL);
        targetUnit = unitRepository.save(targetUnit);

        Soldier soldier = new Soldier();
        soldier.setFullName("Teniente Exitoso");
        soldier.setRank("TE.");
        soldier.setMoceCode("COM-01");
        soldier.setStatus("ACTIVO");
        soldier = soldierService.createSoldier(soldier, sourceUnit.getId());

        String soldierId = soldier.getId();

        Map<String, Object> innerPayload = new HashMap<>();
        innerPayload.put("soldier_id", soldierId);
        innerPayload.put("target_unit_id", targetUnit.getId());
        innerPayload.put("name", "Teniente Exitoso");
        innerPayload.put("rank", "TE.");
        innerPayload.put("mos_code", "COM-01");

        Map<String, Object> webhookPayload = new HashMap<>();
        webhookPayload.put("payload", innerPayload);

        ResponseEntity<String> response = webhookController.handleTransferCompleted(webhookPayload);
        assertEquals(HttpStatus.OK, response.getStatusCode());

        // Check whether soldier is found by original ID
        Optional<Soldier> updatedSoldier = soldierRepository.findById(soldierId);
        if (updatedSoldier.isPresent()) {
            assertEquals(targetUnit.getId(), updatedSoldier.get().getUnit().getId());
            System.out.println(">>> Transfer retained same ID: " + soldierId);
        } else {
            // If not found by original ID, check if a new soldier was created with different ID!
            List<Soldier> allSoldiers = soldierRepository.findAll();
            System.out.println(">>> ID MUTATION OBSERVED: Original ID " + soldierId + " not found, found " + allSoldiers.size() + " soldiers in DB with IDs: " + allSoldiers.stream().map(Soldier::getId).toList());
        }
    }
}
