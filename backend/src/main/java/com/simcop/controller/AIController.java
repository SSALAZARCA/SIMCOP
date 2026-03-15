package com.simcop.controller;

import com.simcop.service.GeminiService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/ai")
public class AIController {

    @Autowired
    private GeminiService geminiService;

    /**
     * General purpose AI generation endpoint
     */
    @PostMapping("/generate")
    public ResponseEntity<Map<String, String>> generateContent(@RequestBody Map<String, String> request) {
        String prompt = request.get("prompt");
        if (prompt == null || prompt.trim().isEmpty()) {
            return ResponseEntity.badRequest().build();
        }

        try {
            String aiResponse = geminiService.generateContent(prompt);
            Map<String, String> response = new HashMap<>();
            response.put("text", aiResponse);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.internalServerError().body(error);
        }
    }
}
