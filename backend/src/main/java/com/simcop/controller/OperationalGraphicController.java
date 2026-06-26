package com.simcop.controller;

import com.simcop.model.OperationalGraphic;
import com.simcop.service.OperationalGraphicService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/graphics")
public class OperationalGraphicController {

    @Autowired
    private OperationalGraphicService service;

    @GetMapping
    public List<OperationalGraphic> getAllGraphics() {
        return service.getAllActive();
    }

    @GetMapping("/plantilla/{type}")
    public List<OperationalGraphic> getGraphicsByPlantilla(@PathVariable String type) {
        return service.getActiveByPlantilla(type);
    }

    @PostMapping
    public OperationalGraphic createGraphic(@RequestBody OperationalGraphic graphic) {
        return service.create(graphic);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteGraphic(@PathVariable String id) {
        service.softDelete(id);
        return ResponseEntity.ok().build();
    }
}
