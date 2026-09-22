package com.sigep;

import com.sigep.controller.AIRecommendationController;
import com.sigep.service.AIRecommendationService;
import com.sigep.service.GenAITacticalService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.client.RestTemplate;

import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class ChallengerAudit2SigepStressTests {

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

    // =========================================================================
    // 1. EMPTY PAYLOADS
    // =========================================================================

    @Test
    @DisplayName("STRESS-EMPTY-01: Null allUnits body returns empty recommendations safely")
    void testNullUnitsResponseBody() {
        when(restTemplate.exchange(contains("/units"), eq(HttpMethod.GET), any(HttpEntity.class), any(ParameterizedTypeReference.class)))
                .thenReturn(new ResponseEntity<>(null, HttpStatus.OK));

        List<Map<String, Object>> recs = assertDoesNotThrow(() -> aiRecommendationService.generateRecommendations());
        assertNotNull(recs);
        assertTrue(recs.isEmpty(), "Should return empty recommendations when allUnits is null");
    }

    @Test
    @DisplayName("STRESS-EMPTY-02: Empty units list [] returns empty recommendations safely")
    void testEmptyUnitsList() {
        when(restTemplate.exchange(contains("/units"), eq(HttpMethod.GET), any(HttpEntity.class), any(ParameterizedTypeReference.class)))
                .thenReturn(new ResponseEntity<>(Collections.emptyList(), HttpStatus.OK));

        List<Map<String, Object>> recs = assertDoesNotThrow(() -> aiRecommendationService.generateRecommendations());
        assertNotNull(recs);
        assertTrue(recs.isEmpty());
    }

    @Test
    @DisplayName("STRESS-EMPTY-03: Null soldiers response returns empty recommendations safely")
    void testNullSoldiersResponse() {
        Map<String, Object> unit = Map.of("id", "U1", "status", "OPERATIONAL", "publicOrderIndex", 2.0);
        when(restTemplate.exchange(contains("/units"), eq(HttpMethod.GET), any(HttpEntity.class), any(ParameterizedTypeReference.class)))
                .thenReturn(new ResponseEntity<>(List.of(unit), HttpStatus.OK));
        when(restTemplate.exchange(contains("/soldiers/search"), eq(HttpMethod.GET), any(HttpEntity.class), any(ParameterizedTypeReference.class)))
                .thenReturn(new ResponseEntity<>(null, HttpStatus.OK));

        List<Map<String, Object>> recs = assertDoesNotThrow(() -> aiRecommendationService.generateRecommendations());
        assertNotNull(recs);
        assertTrue(recs.isEmpty());
    }

    @Test
    @DisplayName("STRESS-EMPTY-04: Empty soldiers list [] returns empty recommendations safely")
    void testEmptySoldiersList() {
        Map<String, Object> targetUnit = Map.of("id", "U-DEF", "status", "ALERTA ROJA", "publicOrderIndex", 9.0);
        Map<String, Object> sourceUnit = Map.of("id", "U-OPT", "status", "OPTIMO", "publicOrderIndex", 2.0);
        when(restTemplate.exchange(contains("/units"), eq(HttpMethod.GET), any(HttpEntity.class), any(ParameterizedTypeReference.class)))
                .thenReturn(new ResponseEntity<>(List.of(targetUnit, sourceUnit), HttpStatus.OK));
        when(restTemplate.exchange(contains("/soldiers/search"), eq(HttpMethod.GET), any(HttpEntity.class), any(ParameterizedTypeReference.class)))
                .thenReturn(new ResponseEntity<>(Collections.emptyList(), HttpStatus.OK));

        List<Map<String, Object>> recs = assertDoesNotThrow(() -> aiRecommendationService.generateRecommendations());
        assertNotNull(recs);
        assertTrue(recs.isEmpty());
    }

    // =========================================================================
    // 2. UNEXPECTED / MALFORMED PAYLOADS & EXCEPTION RESILIENCE
    // =========================================================================

    @Test
    @DisplayName("STRESS-UNEXPECTED-01: Malformed status type (Integer instead of String) causes ClassCastException caught by try-catch")
    void testMalformedStatusType() {
        Map<String, Object> malformedUnit = new HashMap<>();
        malformedUnit.put("id", "U-MALFORMED");
        malformedUnit.put("status", 9999); // Integer instead of String!
        malformedUnit.put("publicOrderIndex", 3.0);

        when(restTemplate.exchange(contains("/units"), eq(HttpMethod.GET), any(HttpEntity.class), any(ParameterizedTypeReference.class)))
                .thenReturn(new ResponseEntity<>(List.of(malformedUnit), HttpStatus.OK));
        when(restTemplate.exchange(contains("/soldiers/search"), eq(HttpMethod.GET), any(HttpEntity.class), any(ParameterizedTypeReference.class)))
                .thenReturn(new ResponseEntity<>(Collections.emptyList(), HttpStatus.OK));

        // The try-catch in generateRecommendations catches ClassCastException and returns empty list
        List<Map<String, Object>> recs = assertDoesNotThrow(() -> aiRecommendationService.generateRecommendations());
        assertNotNull(recs);
        assertTrue(recs.isEmpty(), "Malformed status type triggers ClassCastException caught by handler, returning empty recommendations");
    }

    @Test
    @DisplayName("STRESS-UNEXPECTED-02: String publicOrderIndex causes ClassCastException caught by try-catch")
    void testStringPublicOrderIndex() {
        Map<String, Object> malformedUnit = new HashMap<>();
        malformedUnit.put("id", "U-MALFORMED");
        malformedUnit.put("status", "OPERATIONAL");
        malformedUnit.put("publicOrderIndex", "HIGH_ALERT"); // String instead of Number!

        when(restTemplate.exchange(contains("/units"), eq(HttpMethod.GET), any(HttpEntity.class), any(ParameterizedTypeReference.class)))
                .thenReturn(new ResponseEntity<>(List.of(malformedUnit), HttpStatus.OK));
        when(restTemplate.exchange(contains("/soldiers/search"), eq(HttpMethod.GET), any(HttpEntity.class), any(ParameterizedTypeReference.class)))
                .thenReturn(new ResponseEntity<>(Collections.emptyList(), HttpStatus.OK));

        List<Map<String, Object>> recs = assertDoesNotThrow(() -> aiRecommendationService.generateRecommendations());
        assertNotNull(recs);
        assertTrue(recs.isEmpty());
    }

    @Test
    @DisplayName("STRESS-UNEXPECTED-03: Missing sourceUnit 'id' triggers NPE on sourceUnitId.equals() caught by try-catch")
    void testMissingSourceUnitIdNpe() {
        Map<String, Object> targetUnit = new HashMap<>();
        targetUnit.put("id", "U-TARGET");
        targetUnit.put("publicOrderIndex", 9.0);
        targetUnit.put("status", "ALERTA ROJA");

        Map<String, Object> sourceUnit = new HashMap<>();
        sourceUnit.put("id", null); // NULL id!
        sourceUnit.put("publicOrderIndex", 2.0);
        sourceUnit.put("status", "OPTIMO");

        Map<String, Object> soldier = new HashMap<>();
        soldier.put("id", "S1");
        soldier.put("unitId", "U-SOMEWHERE");
        soldier.put("healthStatus", "APTO");
        soldier.put("timeInPosition", 30);

        when(restTemplate.exchange(contains("/units"), eq(HttpMethod.GET), any(HttpEntity.class), any(ParameterizedTypeReference.class)))
                .thenReturn(new ResponseEntity<>(List.of(targetUnit, sourceUnit), HttpStatus.OK));
        when(restTemplate.exchange(contains("/soldiers/search"), eq(HttpMethod.GET), any(HttpEntity.class), any(ParameterizedTypeReference.class)))
                .thenReturn(new ResponseEntity<>(List.of(soldier), HttpStatus.OK));

        // When sourceUnitId is null, sourceUnitId.equals(soldierUnitId) throws NullPointerException
        // Caught by catch(Exception e)
        List<Map<String, Object>> recs = assertDoesNotThrow(() -> aiRecommendationService.generateRecommendations());
        assertNotNull(recs);
        assertTrue(recs.isEmpty(), "NPE on null sourceUnitId should be swallowed by catch block, returning empty list");
    }

    @Test
    @DisplayName("STRESS-UNEXPECTED-04: Malformed soldier timeInPosition as String causes ClassCastException caught by try-catch")
    void testSoldierMalformedTimeInPosition() {
        Map<String, Object> targetUnit = new HashMap<>();
        targetUnit.put("id", "U-TARGET");
        targetUnit.put("publicOrderIndex", 9.0);

        Map<String, Object> sourceUnit = new HashMap<>();
        sourceUnit.put("id", "U-SOURCE");
        sourceUnit.put("publicOrderIndex", 2.0);

        Map<String, Object> soldier = new HashMap<>();
        soldier.put("id", "S1");
        soldier.put("unitId", "U-SOURCE");
        soldier.put("healthStatus", "APTO");
        soldier.put("timeInPosition", "THIRTY_MONTHS"); // String instead of Number!

        when(restTemplate.exchange(contains("/units"), eq(HttpMethod.GET), any(HttpEntity.class), any(ParameterizedTypeReference.class)))
                .thenReturn(new ResponseEntity<>(List.of(targetUnit, sourceUnit), HttpStatus.OK));
        when(restTemplate.exchange(contains("/soldiers/search"), eq(HttpMethod.GET), any(HttpEntity.class), any(ParameterizedTypeReference.class)))
                .thenReturn(new ResponseEntity<>(List.of(soldier), HttpStatus.OK));

        List<Map<String, Object>> recs = assertDoesNotThrow(() -> aiRecommendationService.generateRecommendations());
        assertNotNull(recs);
        assertTrue(recs.isEmpty());
    }

    // =========================================================================
    // 3. AI RECOMMENDATION CONTROLLER UNHANDLED CRASH VULNERABILITY
    // =========================================================================

    @Test
    @DisplayName("STRESS-CONTROLLER-01: AIRecommendationController.getTacticalAssessment crashes with ClassCastException when payload properties are not Maps")
    void testControllerCrashOnMalformedPayload() {
        AIRecommendationController controller = new AIRecommendationController();
        ReflectionTestUtils.setField(controller, "aiRecommendationService", aiRecommendationService);
        ReflectionTestUtils.setField(controller, "genAITacticalService", genAITacticalService);

        // Malformed payload where "soldier" is a String instead of Map
        Map<String, Object> badPayload = new HashMap<>();
        badPayload.put("soldier", "MALFORMED_STRING_NOT_A_MAP");
        badPayload.put("sourceUnit", Map.of("id", "U1"));
        badPayload.put("targetUnit", Map.of("id", "U2"));

        // AIRecommendationController lines 28-30:
        // Map<String, Object> soldier = (Map<String, Object>) payload.getOrDefault("soldier", Map.of());
        // Lacks try-catch and throws ClassCastException (resulting in HTTP 500 in Spring)
        assertThrows(ClassCastException.class, () -> {
            controller.getTacticalAssessment(badPayload);
        }, "AIRecommendationController.getTacticalAssessment crashes with ClassCastException on non-map input");
    }
}
