package com.simcop;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.simcop.model.MilitaryUnit;
import com.simcop.model.Soldier;
import com.simcop.model.UnitStatus;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Adversarial Challenger Stress Test Suite:
 * Jackson Serialization Cycle and Recursion Verification for Soldier <-> MilitaryUnit.
 */
public class SoldierSerializationCycleStressTests {

    private ObjectMapper objectMapper;

    @BeforeEach
    void setUp() {
        objectMapper = new ObjectMapper();
        objectMapper.registerModule(new JavaTimeModule());
    }

    @Test
    @DisplayName("STRESS-SERIALIZE-01: Serializing Soldier with attached MilitaryUnit does not cause cyclic recursion")
    void testSoldierSerializationWithAttachedUnit() throws Exception {
        MilitaryUnit unit = new MilitaryUnit();
        unit.setId("UNIT-CO-001");
        unit.setName("Batallón de Infantería No. 1");
        unit.setStatus(UnitStatus.OPERATIONAL);

        Soldier soldier = new Soldier();
        soldier.setId("SLD-1001");
        soldier.setFullName("Sargento Primero Ramirez");
        soldier.setRank("SP");
        soldier.setMoceCode("INF");
        soldier.setStatus("ACTIVE");
        soldier.setHealthStatus("APTO");
        soldier.setLegalStatus("HABILITADO");
        soldier.setCursosCombate("LANCERO, PARACAIDISTA");
        soldier.setTimeInPosition(28);
        soldier.setEstimatedRetirementDate(LocalDate.of(2035, 12, 31));
        soldier.setUnit(unit);

        // Circular link
        unit.setPersonnelList(new ArrayList<>(List.of(soldier)));

        // Serialize Soldier
        String soldierJson = assertDoesNotThrow(() -> objectMapper.writeValueAsString(soldier),
                "Serializing Soldier must NOT throw StackOverflowError or InfiniteRecursionException");

        assertNotNull(soldierJson);
        assertTrue(soldierJson.contains("\"unitId\":\"UNIT-CO-001\""), "Must contain unitId");
        assertTrue(soldierJson.contains("\"unit\":{\""), "Must contain unit summary map");
        assertTrue(soldierJson.contains("\"name\":\"Batallón de Infantería No. 1\""), "Unit summary must contain name");
        assertTrue(soldierJson.contains("\"status\":\"OPERATIONAL\""), "Unit summary must contain status name");
        assertFalse(soldierJson.contains("personnelList"), "Soldier serialization must NOT include unit's personnelList");
    }

    @Test
    @DisplayName("STRESS-SERIALIZE-02: Serializing MilitaryUnit with bidirectional Soldier list does not recurse")
    void testMilitaryUnitSerializationWithSoldierList() throws Exception {
        MilitaryUnit unit = new MilitaryUnit();
        unit.setId("UNIT-CO-002");
        unit.setName("Batallón de Fuerzas Especiales");
        unit.setStatus(UnitStatus.ENGAGED);

        List<Soldier> personnel = new ArrayList<>();
        for (int i = 0; i < 10; i++) {
            Soldier s = new Soldier();
            s.setId("SLD-BATCH-" + i);
            s.setFullName("Soldado " + i);
            s.setRank("SLP");
            s.setMoceCode("FE");
            s.setStatus("ACTIVE");
            s.setUnit(unit); // Bidirectional reference
            personnel.add(s);
        }
        unit.setPersonnelList(personnel);

        // Serialize Unit
        String unitJson = assertDoesNotThrow(() -> objectMapper.writeValueAsString(unit),
                "Serializing MilitaryUnit must NOT throw StackOverflowError or InfiniteRecursionException");

        assertNotNull(unitJson);
        assertTrue(unitJson.contains("\"id\":\"UNIT-CO-002\""));
        assertTrue(unitJson.contains("\"personnelList\":["), "Must serialize personnelList");
        assertTrue(unitJson.contains("\"unitId\":\"UNIT-CO-002\""), "Each soldier should have unitId");
        assertFalse(unitJson.contains("\"personnelBreakdown\":null"));
    }

    @Test
    @DisplayName("STRESS-SERIALIZE-03: Stress-testing dense cyclic graph (100 soldiers linked to unit)")
    void testDenseCyclicGraphStress() {
        MilitaryUnit unit = new MilitaryUnit();
        unit.setId("UNIT-HEAVY-01");
        unit.setName("Brigada Pesada");
        unit.setStatus(UnitStatus.OPERATIONAL);

        List<Soldier> soldiers = new ArrayList<>();
        for (int i = 0; i < 100; i++) {
            Soldier s = new Soldier();
            s.setId("S-" + i);
            s.setFullName("Soldier " + i);
            s.setUnit(unit);
            soldiers.add(s);
        }
        unit.setPersonnelList(soldiers);

        long start = System.currentTimeMillis();
        for (int cycle = 0; cycle < 5; cycle++) {
            assertDoesNotThrow(() -> {
                String json = objectMapper.writeValueAsString(unit);
                assertTrue(json.length() > 1000);
            });
        }
        long duration = System.currentTimeMillis() - start;
        assertTrue(duration < 2000, "Serialization of 100 soldiers x 5 cycles must complete in under 2 seconds");
    }

    @Test
    @DisplayName("STRESS-SERIALIZE-04: Soldier with null unit serializes cleanly with unitId=null and unit=null")
    void testSoldierWithNullUnitSerialization() throws Exception {
        Soldier soldier = new Soldier();
        soldier.setId("SLD-ORPHAN");
        soldier.setFullName("Soldado Sin Unidad");
        soldier.setUnit(null);

        String json = assertDoesNotThrow(() -> objectMapper.writeValueAsString(soldier));
        assertNotNull(json);
        assertTrue(json.contains("\"unitId\":null"), "unitId must be null");
        assertTrue(json.contains("\"unit\":null"), "unit summary map must be null");
    }
}
