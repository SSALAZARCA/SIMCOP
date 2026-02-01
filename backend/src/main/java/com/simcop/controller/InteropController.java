package com.simcop.controller;

import com.simcop.service.SiochInteropService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/interop")
@CrossOrigin(origins = "http://localhost:3000", allowedHeaders = "*", methods = { RequestMethod.GET, RequestMethod.POST,
        RequestMethod.PUT, RequestMethod.DELETE })
public class InteropController {

    @Autowired
    private SiochInteropService siochInteropService;

    @PostMapping("/sync/units")
    public ResponseEntity<String> syncUnits() {
        siochInteropService.sendUnitsBatch();
        return ResponseEntity.ok("Sincronización de unidades con SIOCH iniciada.");
    }

    @PostMapping("/sync/personnel")
    public ResponseEntity<String> syncPersonnel() {
        siochInteropService.sendPersonnelBatch();
        return ResponseEntity.ok("Sincronización de personal con SIOCH iniciada.");
    }
}
