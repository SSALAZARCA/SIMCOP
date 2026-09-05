package com.sigep.controller;

import com.sigep.service.AIRecommendationService;
import com.sigep.service.GenAITacticalService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/ai")
public class AIRecommendationController {

    @Autowired
    private AIRecommendationService aiRecommendationService;

    @Autowired
    private GenAITacticalService genAITacticalService;

    @GetMapping("/recommend-transfers")
    public ResponseEntity<?> getRecommendations() {
        return ResponseEntity.ok(aiRecommendationService.generateRecommendations());
    }

    @PostMapping("/tactical-assessment")
    public ResponseEntity<?> getTacticalAssessment(@RequestBody Map<String, Object> payload) {
        Map<String, Object> soldier = (Map<String, Object>) payload.getOrDefault("soldier", Map.of());
        Map<String, Object> sourceUnit = (Map<String, Object>) payload.getOrDefault("sourceUnit", Map.of());
        Map<String, Object> targetUnit = (Map<String, Object>) payload.getOrDefault("targetUnit", Map.of());
        String assessment = genAITacticalService.generateTacticalAssessment(soldier, sourceUnit, targetUnit);
        return ResponseEntity.ok(Map.of("assessment", assessment));
    }
}
