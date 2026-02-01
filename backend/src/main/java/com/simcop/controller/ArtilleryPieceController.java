package com.simcop.controller;

import com.simcop.model.ArtilleryPiece;
import com.simcop.repository.ArtilleryPieceRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/artillery")
public class ArtilleryPieceController {

    @Autowired
    private ArtilleryPieceRepository repository;

    @GetMapping
    public List<ArtilleryPiece> getAllPieces() {
        return repository.findAll();
    }

    @PostMapping
    public ArtilleryPiece createPiece(@RequestBody ArtilleryPiece piece) {
        return repository.save(piece);
    }

    @PutMapping("/{id}")
    public ArtilleryPiece updatePiece(@PathVariable String id, @RequestBody ArtilleryPiece piece) {
        return repository.findById(id).map(existing -> {
            piece.setId(id); // Ensure ID matches
            return repository.save(piece);
        }).orElseThrow(() -> new RuntimeException("Artillery Piece not found: " + id));
    }

    @DeleteMapping("/{id}")
    public void deletePiece(@PathVariable String id) {
        repository.deleteById(id);
    }
}
