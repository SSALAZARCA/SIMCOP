package com.simcop.controller;

import com.simcop.model.UnitHistoryEvent;
import com.simcop.repository.UnitHistoryEventRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;
import org.springframework.transaction.annotation.Transactional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;

import java.util.List;

@RestController
@RequestMapping("/api/history")
@Transactional
public class UnitHistoryEventController {

    private static final Logger logger = LoggerFactory.getLogger(UnitHistoryEventController.class);

    @Autowired
    private UnitHistoryEventRepository repository;

    @GetMapping
    public List<UnitHistoryEvent> getAllEvents() {
        return repository.findAll();
    }

    @PostMapping
    public ResponseEntity<UnitHistoryEvent> createEvent(@RequestBody UnitHistoryEvent event) {
        try {
            UnitHistoryEvent saved = repository.save(event);
            logger.info("✅ Evento de historial creado para unidad: {}", saved.getUnitId());
            return ResponseEntity.ok(saved);
        } catch (Exception e) {
            logger.error("❌ Error creando evento de historial: {}", e.getMessage());
            return ResponseEntity.internalServerError().build();
        }
    }

    @GetMapping("/unit/{unitId}")
    public List<UnitHistoryEvent> getEventsByUnit(@PathVariable String unitId) {
        return repository.findByUnitId(unitId);
    }
}
