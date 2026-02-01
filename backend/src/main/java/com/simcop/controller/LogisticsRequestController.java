package com.simcop.controller;

import com.simcop.model.LogisticsRequest;
import com.simcop.repository.LogisticsRequestRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/logistics")
@CrossOrigin(origins = "*")
public class LogisticsRequestController {

    @Autowired
    private LogisticsRequestRepository repository;

    @GetMapping
    public List<LogisticsRequest> getAllRequests() {
        return repository.findAll();
    }

    @PostMapping
    public LogisticsRequest createRequest(@RequestBody LogisticsRequest request) {
        return repository.save(request);
    }

    @PutMapping("/{id}")
    public ResponseEntity<LogisticsRequest> updateRequest(@PathVariable String id,
            @RequestBody LogisticsRequest requestDetails) {
        return repository.findById(id)
                .map(request -> {
                    request.setStatus(requestDetails.getStatus());
                    request.setFulfilledTimestamp(requestDetails.getFulfilledTimestamp());
                    request.setFulfilledByUserId(requestDetails.getFulfilledByUserId());
                    return ResponseEntity.ok(repository.save(request));
                })
                .orElse(ResponseEntity.notFound().build());
    }
}
