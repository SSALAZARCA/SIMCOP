package com.simcop.controller;

import com.simcop.model.ForwardObserver;
import com.simcop.repository.ForwardObserverRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/observers")
public class ForwardObserverController {

    @Autowired
    private ForwardObserverRepository repository;

    @GetMapping
    public List<ForwardObserver> getAllObservers() {
        return repository.findAll();
    }

    @PostMapping
    public ForwardObserver createObserver(@RequestBody ForwardObserver observer) {
        return repository.save(observer);
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
