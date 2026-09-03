package com.simcop.controller;

import com.simcop.model.SpecialtyCatalog;
import com.simcop.repository.SpecialtyCatalogRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/specialty-catalog")
@org.springframework.security.access.prepost.PreAuthorize("isAuthenticated()")
public class SpecialtyCatalogController {

    private static final Logger logger = LoggerFactory.getLogger(SpecialtyCatalogController.class);

    @Autowired
    private SpecialtyCatalogRepository repository;

    @GetMapping
    public ResponseEntity<List<SpecialtyCatalog>> getAll() {
        try {
            List<SpecialtyCatalog> specialties = repository.findAll();
            return ResponseEntity.ok(specialties);
        } catch (Exception e) {
            logger.error("Error fetching specialty catalog: {}", e.getMessage());
            return ResponseEntity.internalServerError().build();
        }
    }

    @GetMapping("/category/{category}")
    public ResponseEntity<List<SpecialtyCatalog>> getByCategory(@PathVariable String category) {
        return ResponseEntity.ok(repository.findByCategory(category));
    }

    @PostMapping
    @org.springframework.security.access.prepost.PreAuthorize("hasRole('ADMINISTRATOR')")
    public ResponseEntity<SpecialtyCatalog> create(@RequestBody SpecialtyCatalog specialty) {
        try {
            if (repository.findByCode(specialty.getCode()).isPresent()) {
                return ResponseEntity.badRequest().build();
            }
            return ResponseEntity.ok(repository.save(specialty));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }

    @GetMapping("/{id}")
    public ResponseEntity<SpecialtyCatalog> getById(@PathVariable String id) {
        return repository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PutMapping("/{id}")
    @org.springframework.security.access.prepost.PreAuthorize("hasRole('ADMINISTRATOR')")
    public ResponseEntity<SpecialtyCatalog> update(@PathVariable String id, @RequestBody SpecialtyCatalog specialty) {
        if (!repository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }
        specialty.setId(id);
        return ResponseEntity.ok(repository.save(specialty));
    }

    @DeleteMapping("/{id}")
    @org.springframework.security.access.prepost.PreAuthorize("hasRole('ADMINISTRATOR')")
    public ResponseEntity<Void> delete(@PathVariable String id) {
        if (!repository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }
        repository.deleteById(id);
        return ResponseEntity.noContent().build();
    }
}
