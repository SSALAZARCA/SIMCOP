package com.simcop.controller;

import com.simcop.model.Q5Report;
import com.simcop.repository.Q5ReportRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/q5")
@CrossOrigin(origins = "*")
public class Q5ReportController {

    @Autowired
    private Q5ReportRepository repository;

    @GetMapping
    public List<Q5Report> getAllReports() {
        return repository.findAll();
    }

    @Autowired
    private com.simcop.service.TelegramService telegramService;

    @PostMapping
    public Q5Report createReport(@RequestBody Q5Report report) {
        return repository.save(report);
    }

    @PostMapping("/{id}/send")
    public org.springframework.http.ResponseEntity<?> sendReport(@PathVariable String id) {
        return repository.findById(id).map(report -> {
            boolean sent = telegramService.sendQ5Report(report);
            if (sent) {
                return org.springframework.http.ResponseEntity.ok().body("Report sent to Telegram");
            } else {
                return org.springframework.http.ResponseEntity.status(500).body("Failed to send report");
            }
        }).orElse(org.springframework.http.ResponseEntity.notFound().build());
    }
}
