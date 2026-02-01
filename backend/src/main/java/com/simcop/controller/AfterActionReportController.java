package com.simcop.controller;

import com.simcop.model.AfterActionReport;
import com.simcop.repository.AfterActionReportRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/aar")
@CrossOrigin(origins = "*")
public class AfterActionReportController {

    @Autowired
    private AfterActionReportRepository repository;

    @GetMapping
    public List<AfterActionReport> getAllReports() {
        return repository.findAll();
    }

    @PostMapping
    public AfterActionReport createReport(@RequestBody AfterActionReport report) {
        return repository.save(report);
    }
}
