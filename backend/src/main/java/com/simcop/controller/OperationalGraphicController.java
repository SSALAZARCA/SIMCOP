package com.simcop.controller;

import com.simcop.model.OperationalGraphic;
import com.simcop.service.OperationalGraphicService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api/graphics")
@org.springframework.security.access.prepost.PreAuthorize("isAuthenticated()")
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
        org.springframework.security.core.Authentication auth = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.isAuthenticated()) {
            graphic.setCreatedByUserId(auth.getName());
        }
        return service.create(graphic);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteGraphic(@PathVariable String id) {
        Optional<OperationalGraphic> graphicOpt = service.getById(id);
        if (graphicOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        OperationalGraphic graphic = graphicOpt.get();
        org.springframework.security.core.Authentication auth = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
        boolean isAdmin = auth != null && auth.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_ADMINISTRATOR") || a.getAuthority().equals("ROLE_COMANDANTE_EJERCITO"));
        boolean isOwner = graphic.getCreatedByUserId() != null && auth != null && graphic.getCreatedByUserId().equalsIgnoreCase(auth.getName());

        if (!isAdmin && !isOwner) {
            return ResponseEntity.status(403).body("You do not have permission to delete this operational graphic.");
        }

        service.softDelete(id);
        return ResponseEntity.ok().build();
    }
}
