package com.simcop.controller;

import com.simcop.model.UnitHistoryEvent;
import com.simcop.repository.UnitHistoryEventRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/history")
@CrossOrigin(origins = "http://localhost:3000", allowedHeaders = "*", methods = { RequestMethod.GET, RequestMethod.POST,
        RequestMethod.PUT, RequestMethod.DELETE })
public class UnitHistoryEventController {

    @Autowired
    private UnitHistoryEventRepository repository;

    @GetMapping
    public List<UnitHistoryEvent> getAllEvents() {
        return repository.findAll();
    }

    @PostMapping
    public UnitHistoryEvent createEvent(@RequestBody UnitHistoryEvent event) {
        return repository.save(event);
    }

    @GetMapping("/unit/{unitId}")
    public List<UnitHistoryEvent> getEventsByUnit(@PathVariable String unitId) {
        return repository.findByUnitId(unitId);
    }
}
