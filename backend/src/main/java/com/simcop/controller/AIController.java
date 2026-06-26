package com.simcop.controller;

import com.simcop.service.AIQueueService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/ai")
public class AIController {

    @Autowired
    private AIQueueService aiQueueService;

    /**
     * General purpose AI generation endpoint (Enqueue and return task ID)
     */
    @PostMapping("/generate")
    public ResponseEntity<?> generateContent(@RequestBody Map<String, String> request) {
        String prompt = request.get("prompt");
        if (prompt == null || prompt.trim().isEmpty()) {
            return ResponseEntity.badRequest().build();
        }

        try {
            AIQueueService.TaskInfo task = aiQueueService.submitTask(prompt);
            return ResponseEntity.ok(task);
        } catch (Exception e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.internalServerError().body(error);
        }
    }

    /**
     * Get queue status and results for a specific task
     */
    @GetMapping("/queue/{taskId}")
    public ResponseEntity<?> getQueueStatus(@PathVariable String taskId) {
        AIQueueService.TaskInfo task = aiQueueService.getTaskStatus(taskId);
        if (task == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(task);
    }
}
