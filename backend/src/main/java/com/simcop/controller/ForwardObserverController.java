package com.simcop.controller;

import com.simcop.model.ForwardObserver;
import com.simcop.repository.ForwardObserverRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;
import org.springframework.transaction.annotation.Transactional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;

import java.util.List;

@RestController
@RequestMapping("/api/observers")
@Transactional
@org.springframework.security.access.prepost.PreAuthorize("hasAnyRole('ADMINISTRATOR', 'COMANDANTE_OBSERVADOR_ADELANTADO', 'COMANDANTE_EJERCITO', 'COMANDANTE_DIVISION', 'COMANDANTE_BRIGADA', 'COMANDANTE_BATALLON', 'COMANDANTE_COMPANIA', 'COMANDANTE_PELOTON')")
public class ForwardObserverController {

    private static final Logger logger = LoggerFactory.getLogger(ForwardObserverController.class);

    @Autowired
    private ForwardObserverRepository repository;

    @GetMapping
    public List<ForwardObserver> getAllObservers() {
        return repository.findAll();
    }

    @PostMapping
    public ResponseEntity<ForwardObserver> createObserver(@RequestBody ForwardObserver observer) {
        try {
            ForwardObserver saved = repository.save(observer);
            logger.info("✅ Observador Avanzado creado: ID={}", saved.getId());
            return ResponseEntity.ok(saved);
        } catch (Exception e) {
            logger.error("❌ Error creando observador: {}", e.getMessage());
            return ResponseEntity.internalServerError().build();
        }
    }

    @PutMapping("/{id}")
    public ForwardObserver updateObserver(@PathVariable String id, @RequestBody ForwardObserver observer) {
        return repository.findById(id).map(existing -> {
            observer.setId(id);
            return repository.save(observer);
        }).orElseThrow(() -> new RuntimeException("Observer not found: " + id));
    }

    @DeleteMapping("/{id}")
    public void deleteObserver(@PathVariable String id) {
        repository.deleteById(id);
    }
}
