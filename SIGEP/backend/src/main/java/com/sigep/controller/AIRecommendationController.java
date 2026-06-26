package com.sigep.controller;

import com.sigep.service.AIRecommendationService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/ai")
public class AIRecommendationController {

    @Autowired
    private AIRecommendationService aiRecommendationService;

    @GetMapping("/recommend-transfers")
    public ResponseEntity<?> getRecommendations() {
        return ResponseEntity.ok(aiRecommendationService.generateRecommendations());
    }
}
