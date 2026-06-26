package com.simcop.controller;

import com.simcop.model.ArtilleryPiece;
import com.simcop.repository.ArtilleryPieceRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.List;

@RestController
@RequestMapping("/api/artillery")
@Transactional
public class ArtilleryPieceController {

    private static final Logger logger = LoggerFactory.getLogger(ArtilleryPieceController.class);

    @Autowired
    private ArtilleryPieceRepository repository;

    @GetMapping
    public List<ArtilleryPiece> getAllPieces() {
        return repository.findAll();
    }

    @PostMapping
    @org.springframework.security.access.prepost.PreAuthorize("hasRole('ADMINISTRATOR')")
    public ResponseEntity<ArtilleryPiece> createPiece(@RequestBody ArtilleryPiece piece) {
        try {
            ArtilleryPiece saved = repository.save(piece);
            logger.info("✅ Pieza de Artillería creada: ID={}, Nombre={}", saved.getId(), saved.getName());
            return ResponseEntity.ok(saved);
        } catch (Exception e) {
            logger.error("❌ Error persistiendo pieza de artillería: {}", e.getMessage(), e);
            return ResponseEntity.internalServerError().build();
        }
    }

    @PutMapping("/{id}")
    @org.springframework.security.access.prepost.PreAuthorize("hasRole('ADMINISTRATOR')")
    public ResponseEntity<ArtilleryPiece> updatePiece(@PathVariable String id, @RequestBody ArtilleryPiece piece) {
        try {
            return repository.findById(id).map(existing -> {
                piece.setId(id);
                ArtilleryPiece saved = repository.save(piece);
                logger.info("✅ Pieza de Artillería actualizada: ID={}", id);
                return ResponseEntity.ok(saved);
            }).orElse(ResponseEntity.notFound().build());
        } catch (Exception e) {
            logger.error("❌ Error actualizando pieza de artillería {}: {}", id, e.getMessage());
            return ResponseEntity.internalServerError().build();
        }
    }

    @DeleteMapping("/{id}")
    @org.springframework.security.access.prepost.PreAuthorize("hasRole('ADMINISTRATOR')")
    public void deletePiece(@PathVariable String id) {
        repository.deleteById(id);
    }
}
