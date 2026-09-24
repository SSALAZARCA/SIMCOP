package com.sigep;

import com.sigep.dto.TransferViabilityResult;
import com.sigep.model.Novedad;
import com.sigep.model.Soldier;
import com.sigep.model.Transfer;
import com.sigep.repository.NovedadRepository;
import com.sigep.repository.SoldierRepository;
import com.sigep.repository.TransferRepository;
import com.sigep.service.AIRecommendationService;
import com.sigep.service.AnalysisService;
import com.sigep.service.TransferService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestTemplate;

import com.sigep.service.GenAITacticalService;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

import java.time.LocalDate;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * Adversarial Challenger Stress Test Suite for SIGEP Backend:
 * 1. Veto logic stress-test in AnalysisService across diverse combat and non-combat statuses.
 * 2. AI Recommendation null-safety stress-test in AIRecommendationService with missing fields.
 * 3. Transactional boundaries and authorization in TransferService.
 */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
public class ChallengerSigepStressTests {

    @Nested
    @DisplayName("VECTOR 1: VETO LOGIC STRESS-TEST (AnalysisService)")
    class VetoLogicStressTests {

        @Mock
        private SoldierRepository soldierRepository;

        @Mock
        private RestTemplate restTemplate;

        @InjectMocks
        private AnalysisService analysisService;

        private final String soldierId = "SLD-TEST-001";
        private final String sourceUnitId = "UNIT-ORIGIN-01";
        private final String targetUnitId = "UNIT-DEST-02";

        @BeforeEach
        void setup() {
            ReflectionTestUtils.setField(analysisService, "configuredSimcopUrl", "http://localhost:8080/api");
            ReflectionTestUtils.setField(analysisService, "configuredServiceToken", "test-token-2026");

            Soldier soldier = new Soldier();
            soldier.setId(soldierId);
            soldier.setUnitId(sourceUnitId);
            soldier.setMosCode("INF");
            soldier.setStatus("ACTIVE");
            soldier.setRank("SLP");

            when(soldierRepository.findById(soldierId)).thenReturn(Optional.of(soldier));
            when(soldierRepository.findAll()).thenReturn(List.of(soldier));

            // Default mock for TOE fetch returning empty or error to isolate tactical-status testing
            when(restTemplate.exchange(
                    contains("/units/" + sourceUnitId),
                    eq(HttpMethod.GET),
                    any(HttpEntity.class),
                    eq(Map.class)
            )).thenReturn(new ResponseEntity<>(Map.of(), HttpStatus.OK));
        }

        @Test
        @DisplayName("STRESS-VETO-01: Correctly allows transfer regardless of operational status (Combat veto eliminated)")
        void testCombatVetoEliminated() {
            TransferViabilityResult result = analysisService.checkTransferViability(soldierId, targetUnitId);
            assertNotNull(result);
            assertTrue(result.isViable(), "Transfer must be viable as combat veto was eliminated");
        }

        @Test
        @DisplayName("STRESS-VETO-02: Health condition non-APTO correctly blocks transfer")
        void testHealthBlocksTransfer() {
            Soldier injured = new Soldier();
            injured.setId(soldierId);
            injured.setUnitId(sourceUnitId);
            injured.setMosCode("INF");
            injured.setStatus("ACTIVE");
            injured.setRank("SLP");
            injured.setHealthStatus("NO APTO");
            when(soldierRepository.findById(soldierId)).thenReturn(Optional.of(injured));

            TransferViabilityResult result = analysisService.checkTransferViability(soldierId, targetUnitId);
            assertFalse(result.isViable());
            assertTrue(result.isBlockedByHealth());
            assertTrue(result.getMessage().contains("BLOQUEO DE SANIDAD"));
        }

        @Test
        @DisplayName("STRESS-VETO-03: Excusa Medica blocks transfer")
        void testExcusaMedicaBlocksTransfer() {
            Soldier injured = new Soldier();
            injured.setId(soldierId);
            injured.setUnitId(sourceUnitId);
            injured.setMosCode("INF");
            injured.setStatus("ACTIVE");
            injured.setRank("SLP");
            injured.setHealthStatus("EXCUSA MEDICA");
            when(soldierRepository.findById(soldierId)).thenReturn(Optional.of(injured));

            TransferViabilityResult result = analysisService.checkTransferViability(soldierId, targetUnitId);
            assertFalse(result.isViable());
            assertTrue(result.isBlockedByHealth());
        }

        @Test
        @DisplayName("STRESS-VETO-04: Non-existent soldier returns non-viable")
        void testNonExistentSoldier() {
            when(soldierRepository.findById("UNKNOWN")).thenReturn(Optional.empty());
            TransferViabilityResult result = analysisService.checkTransferViability("UNKNOWN", targetUnitId);
            assertFalse(result.isViable());
            assertEquals("Soldado no encontrado.", result.getMessage());
        }

        @Test
        @DisplayName("STRESS-VETO-05: Viable soldier with APTO health passes")
        void testAptoHealthPasses() {
            Soldier healthy = new Soldier();
            healthy.setId(soldierId);
            healthy.setUnitId(sourceUnitId);
            healthy.setMosCode("INF");
            healthy.setStatus("ACTIVE");
            healthy.setRank("SLP");
            healthy.setHealthStatus("APTO");
            when(soldierRepository.findById(soldierId)).thenReturn(Optional.of(healthy));

            TransferViabilityResult result = analysisService.checkTransferViability(soldierId, targetUnitId);
            assertTrue(result.isViable());
            assertFalse(result.isBlockedByHealth());
        }
    }

    @Nested
    @DisplayName("VECTOR 2: AI RECOMMENDATION NULL-SAFETY STRESS-TEST (AIRecommendationService)")
    class AIRecommendationNullSafetyTests {

        @Mock
        private RestTemplate restTemplate;

        @Mock
        private GenAITacticalService genAITacticalService;

        @InjectMocks
        private AIRecommendationService aiRecommendationService;

        @BeforeEach
        void setup() {
            ReflectionTestUtils.setField(aiRecommendationService, "configuredSimcopUrl", "http://localhost:8080/api");
            ReflectionTestUtils.setField(aiRecommendationService, "configuredServiceToken", "test-token-2026");
        }

        @Test
        @DisplayName("STRESS-AI-01: Null cursosCombate safely defaults to 'NINGUNO'")
        void testNullCursosCombate() {
            // Target unit in critical deficit
            Map<String, Object> targetUnit = new HashMap<>();
            targetUnit.put("id", "UNIT-DEFICIT-01");
            targetUnit.put("publicOrderIndex", 9.5);
            targetUnit.put("status", "ALERTA ROJA");

            // Source unit in optimal status
            Map<String, Object> sourceUnit = new HashMap<>();
            sourceUnit.put("id", "UNIT-OPTIMAL-01");
            sourceUnit.put("publicOrderIndex", 2.0);
            sourceUnit.put("status", "OPTIMO");

            when(restTemplate.exchange(
                    contains("/units"),
                    eq(HttpMethod.GET),
                    any(HttpEntity.class),
                    any(ParameterizedTypeReference.class)
            )).thenReturn(new ResponseEntity<>(List.of(targetUnit, sourceUnit), HttpStatus.OK));

            // Soldier with cursosCombate == null
            Map<String, Object> soldierWithNullCursos = new HashMap<>();
            soldierWithNullCursos.put("id", "S-001");
            soldierWithNullCursos.put("fullName", "Cabo Gomez");
            soldierWithNullCursos.put("rank", "CP");
            soldierWithNullCursos.put("moceCode", "INF");
            soldierWithNullCursos.put("healthStatus", "APTO");
            soldierWithNullCursos.put("timeInPosition", 30);
            soldierWithNullCursos.put("cursosCombate", null); // <--- NULL cursosCombate
            soldierWithNullCursos.put("unitId", "UNIT-OPTIMAL-01");

            when(restTemplate.exchange(
                    contains("/soldiers/search"),
                    eq(HttpMethod.GET),
                    any(HttpEntity.class),
                    any(ParameterizedTypeReference.class)
            )).thenReturn(new ResponseEntity<>(List.of(soldierWithNullCursos), HttpStatus.OK));

            List<Map<String, Object>> recommendations = assertDoesNotThrow(
                    () -> aiRecommendationService.generateRecommendations(),
                    "generateRecommendations must NOT throw NullPointerException when cursosCombate is null"
            );

            assertNotNull(recommendations);
            assertEquals(1, recommendations.size());
            Map<String, Object> rec = recommendations.get(0);
            Map<String, Object> soldierData = (Map<String, Object>) rec.get("soldier");
            assertNotNull(soldierData);
            assertEquals("NINGUNO", soldierData.get("cursosCombate"), "Null cursosCombate must safely default to NINGUNO");
        }

        @Test
        @DisplayName("STRESS-AI-02: Null timeInPosition skips candidate safely without NPE")
        void testNullTimeInPosition() {
            Map<String, Object> targetUnit = new HashMap<>();
            targetUnit.put("id", "UNIT-DEFICIT-01");
            targetUnit.put("publicOrderIndex", 9.5);

            Map<String, Object> sourceUnit = new HashMap<>();
            sourceUnit.put("id", "UNIT-OPTIMAL-01");
            sourceUnit.put("publicOrderIndex", 2.0);

            when(restTemplate.exchange(
                    contains("/units"),
                    eq(HttpMethod.GET),
                    any(HttpEntity.class),
                    any(ParameterizedTypeReference.class)
            )).thenReturn(new ResponseEntity<>(List.of(targetUnit, sourceUnit), HttpStatus.OK));

            // Soldier with timeInPosition == null
            Map<String, Object> soldierWithNullTime = new HashMap<>();
            soldierWithNullTime.put("id", "S-002");
            soldierWithNullTime.put("fullName", "Soldado Perez");
            soldierWithNullTime.put("healthStatus", "APTO");
            soldierWithNullTime.put("timeInPosition", null); // <--- NULL timeInPosition
            soldierWithNullTime.put("unitId", "UNIT-OPTIMAL-01");

            when(restTemplate.exchange(
                    contains("/soldiers/search"),
                    eq(HttpMethod.GET),
                    any(HttpEntity.class),
                    any(ParameterizedTypeReference.class)
            )).thenReturn(new ResponseEntity<>(List.of(soldierWithNullTime), HttpStatus.OK));

            List<Map<String, Object>> recommendations = assertDoesNotThrow(
                    () -> aiRecommendationService.generateRecommendations(),
                    "generateRecommendations must NOT throw NPE when timeInPosition is null"
            );

            assertNotNull(recommendations);
            assertTrue(recommendations.isEmpty(), "Soldier with null timeInPosition must be skipped (not >= 24 months)");
        }

        @Test
        @DisplayName("STRESS-AI-03: Null moceCode and mosCode safely default to empty string")
        void testNullMoceCode() {
            Map<String, Object> targetUnit = new HashMap<>();
            targetUnit.put("id", "UNIT-DEFICIT-01");
            targetUnit.put("publicOrderIndex", 9.5);

            Map<String, Object> sourceUnit = new HashMap<>();
            sourceUnit.put("id", "UNIT-OPTIMAL-01");
            sourceUnit.put("publicOrderIndex", 2.0);

            when(restTemplate.exchange(
                    contains("/units"),
                    eq(HttpMethod.GET),
                    any(HttpEntity.class),
                    any(ParameterizedTypeReference.class)
            )).thenReturn(new ResponseEntity<>(List.of(targetUnit, sourceUnit), HttpStatus.OK));

            // Soldier with moceCode == null AND mosCode == null
            Map<String, Object> soldierWithNullMoce = new HashMap<>();
            soldierWithNullMoce.put("id", "S-003");
            soldierWithNullMoce.put("fullName", "Soldado Silva");
            soldierWithNullMoce.put("healthStatus", "APTO");
            soldierWithNullMoce.put("timeInPosition", 36);
            soldierWithNullMoce.put("moceCode", null); // <--- NULL moceCode
            soldierWithNullMoce.put("mosCode", null);  // <--- NULL mosCode
            soldierWithNullMoce.put("unitId", "UNIT-OPTIMAL-01");

            when(restTemplate.exchange(
                    contains("/soldiers/search"),
                    eq(HttpMethod.GET),
                    any(HttpEntity.class),
                    any(ParameterizedTypeReference.class)
            )).thenReturn(new ResponseEntity<>(List.of(soldierWithNullMoce), HttpStatus.OK));

            List<Map<String, Object>> recommendations = assertDoesNotThrow(
                    () -> aiRecommendationService.generateRecommendations()
            );

            assertEquals(1, recommendations.size());
            Map<String, Object> soldierData = (Map<String, Object>) recommendations.get(0).get("soldier");
            assertEquals("", soldierData.get("moceCode"), "Null moceCode must safely default to empty string");
        }

        @Test
        @DisplayName("STRESS-AI-04: Resolves soldier unit via unit summary Map or unitId without NPE")
        void testUnitResolutionVariations() {
            Map<String, Object> targetUnit = Map.of("id", "U-DEF", "publicOrderIndex", 9.0);
            Map<String, Object> sourceUnit = Map.of("id", "U-SRC", "publicOrderIndex", 1.0);

            when(restTemplate.exchange(
                    contains("/units"),
                    eq(HttpMethod.GET),
                    any(HttpEntity.class),
                    any(ParameterizedTypeReference.class)
            )).thenReturn(new ResponseEntity<>(List.of(targetUnit, sourceUnit), HttpStatus.OK));

            // Case A: unit is Map with id
            Map<String, Object> sMap = new HashMap<>();
            sMap.put("id", "S-A");
            sMap.put("healthStatus", "APTO");
            sMap.put("timeInPosition", 28);
            sMap.put("unit", Map.of("id", "U-SRC", "name", "Brigada 1"));

            when(restTemplate.exchange(
                    contains("/soldiers/search"),
                    eq(HttpMethod.GET),
                    any(HttpEntity.class),
                    any(ParameterizedTypeReference.class)
            )).thenReturn(new ResponseEntity<>(List.of(sMap), HttpStatus.OK));

            List<Map<String, Object>> recs = assertDoesNotThrow(() -> aiRecommendationService.generateRecommendations());
            assertEquals(1, recs.size(), "Must successfully match candidate with unit as Map");
        }

        @Test
        @DisplayName("STRESS-AI-05: Adversarial edge cases - all units null, all soldiers null, empty payloads")
        void testAdversarialEmptyAndNullPayloads() {
            when(restTemplate.exchange(
                    contains("/units"),
                    eq(HttpMethod.GET),
                    any(HttpEntity.class),
                    any(ParameterizedTypeReference.class)
            )).thenReturn(new ResponseEntity<>(null, HttpStatus.OK));

            List<Map<String, Object>> recs = assertDoesNotThrow(() -> aiRecommendationService.generateRecommendations());
            assertNotNull(recs);
            assertTrue(recs.isEmpty());
        }
    }

    @Nested
    @DisplayName("VECTOR 4: TRANSACTIONAL BOUNDARIES & ATOMICITY (TransferService)")
    class TransferTransactionalBoundariesTests {

        @Mock
        private TransferRepository transferRepository;

        @Mock
        private SoldierRepository soldierRepository;

        @Mock
        private NovedadRepository novedadRepository;

        @InjectMocks
        private TransferService transferService;

        @Test
        @DisplayName("STRESS-TX-01: Unauthorized role attempting approval is rejected before any mutation")
        void testUnauthorizedApprovalRejected() {
            Transfer transfer = new Transfer();
            transfer.setId("TX-999");
            transfer.setSoldierId("SLD-001");
            transfer.setStatus("PENDING_APPROVAL");

            when(transferRepository.findById("TX-999")).thenReturn(Optional.of(transfer));

            // Attempting approval with ROLE_BATALLON (should be rejected)
            SecurityException exception = assertThrows(SecurityException.class, () ->
                    transferService.updateTransferStatus("TX-999", "APPROVED", "capitan_rojas", "ROLE_BATALLON")
            );

            assertTrue(exception.getMessage().contains("Solo el Comando Superior"));
            verify(soldierRepository, never()).save(any());
            verify(novedadRepository, never()).save(any());
            verify(transferRepository, never()).save(any());
        }

        @Test
        @DisplayName("STRESS-TX-02: Approved transfer performs atomic mutation of Soldier, Novedad, and Transfer")
        void testApprovedTransferAtomicExecution() {
            Transfer transfer = new Transfer();
            transfer.setId("TX-100");
            transfer.setSoldierId("SLD-555");
            transfer.setOriginUnitId("UNIT-ALPHA");
            transfer.setDestinationUnitId("UNIT-BRAVO");
            transfer.setStatus("PENDING_APPROVAL");

            Soldier soldier = new Soldier();
            soldier.setId("SLD-555");
            soldier.setUnitId("UNIT-ALPHA");
            soldier.setUnitHistory(new ArrayList<>(List.of("UNIT-OLD-0")));

            when(transferRepository.findById("TX-100")).thenReturn(Optional.of(transfer));
            when(soldierRepository.findById("SLD-555")).thenReturn(Optional.of(soldier));
            when(transferRepository.save(any(Transfer.class))).thenAnswer(i -> i.getArgument(0));

            Transfer result = transferService.updateTransferStatus("TX-100", "APPROVED", "general_mendoza", "ROLE_EJERCITO");

            assertNotNull(result);
            assertEquals("APPROVED", result.getStatus());

            // 1. Verify Soldier update
            ArgumentCaptor<Soldier> soldierCaptor = ArgumentCaptor.forClass(Soldier.class);
            verify(soldierRepository, times(1)).save(soldierCaptor.capture());
            Soldier savedSoldier = soldierCaptor.getValue();
            assertEquals("UNIT-BRAVO", savedSoldier.getUnitId(), "Soldier must have destination unitId");
            assertEquals(LocalDate.now(), savedSoldier.getAssignmentDate(), "Assignment date must be today");
            assertTrue(savedSoldier.getUnitHistory().contains("UNIT-ALPHA"), "Origin unit must be appended to history");

            // 2. Verify Novedad audit record creation
            ArgumentCaptor<Novedad> novedadCaptor = ArgumentCaptor.forClass(Novedad.class);
            verify(novedadRepository, times(1)).save(novedadCaptor.capture());
            Novedad savedNovedad = novedadCaptor.getValue();
            assertEquals("TRASLADO", savedNovedad.getTipo());
            assertEquals("SLD-555", savedNovedad.getSoldierId());
            assertEquals("UNIT-BRAVO", savedNovedad.getUnitId());
            assertEquals("general_mendoza", savedNovedad.getRegistradoPor());

            // 3. Verify Transfer status update
            verify(transferRepository, times(1)).save(transfer);
        }

        @Test
        @DisplayName("STRESS-TX-03: Rejection status does NOT alter Soldier or Novedad records")
        void testRejectedTransferLeavesSoldierIntact() {
            Transfer transfer = new Transfer();
            transfer.setId("TX-101");
            transfer.setSoldierId("SLD-555");
            transfer.setStatus("PENDING_APPROVAL");

            when(transferRepository.findById("TX-101")).thenReturn(Optional.of(transfer));
            when(transferRepository.save(any(Transfer.class))).thenAnswer(i -> i.getArgument(0));

            Transfer result = transferService.updateTransferStatus("TX-101", "REJECTED", "general_mendoza", "ROLE_EJERCITO");

            assertEquals("REJECTED", result.getStatus());
            verify(soldierRepository, never()).save(any());
            verify(novedadRepository, never()).save(any());
            verify(transferRepository, times(1)).save(transfer);
        }
    }
}
