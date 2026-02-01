package com.simcop.controller;

import com.simcop.model.SpecialtyCatalog;
import com.simcop.repository.SpecialtyCatalogRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/specialty-catalog")
@CrossOrigin(origins = "http://localhost:3000", allowedHeaders = "*", methods = { RequestMethod.GET, RequestMethod.POST,
        RequestMethod.PUT, RequestMethod.DELETE })
public class SpecialtyCatalogController {

    @Autowired
    private SpecialtyCatalogRepository repository;

    @GetMapping
    public ResponseEntity<List<SpecialtyCatalog>> getAll() {
        try {
            List<SpecialtyCatalog> specialties = repository.findAll();
            return ResponseEntity.ok(specialties);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.internalServerError().build();
        }
    }

    @GetMapping("/category/{category}")
    public ResponseEntity<List<SpecialtyCatalog>> getByCategory(@PathVariable String category) {
        return ResponseEntity.ok(repository.findByCategory(category));
    }

    @PostMapping
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
    public ResponseEntity<SpecialtyCatalog> update(@PathVariable String id, @RequestBody SpecialtyCatalog specialty) {
        if (!repository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }
        specialty.setId(id);
        return ResponseEntity.ok(repository.save(specialty));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable String id) {
        if (!repository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }
        repository.deleteById(id);
        return ResponseEntity.noContent().build();
    }
}
