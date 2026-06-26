package com.sigep.controller;

import com.sigep.model.SystemParameter;
import com.sigep.repository.SystemParameterRepository;
import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/parameters")
public class SystemParameterController {

    @Autowired
    private SystemParameterRepository repository;

    @PostConstruct
    public void init() {
        if (!repository.existsById("CRITICAL_DEFICIT_THRESHOLD")) {
            repository.save(new SystemParameter("CRITICAL_DEFICIT_THRESHOLD", "85", "Umbral de % para declarar déficit Crítico en una unidad."));
        }
        if (!repository.existsById("WARNING_DEFICIT_THRESHOLD")) {
            repository.save(new SystemParameter("WARNING_DEFICIT_THRESHOLD", "95", "Umbral de % para declarar Advertencia operacional en una unidad."));
        }
        if (!repository.existsById("MAX_PENDING_TRANSFERS")) {
            repository.save(new SystemParameter("MAX_PENDING_TRANSFERS", "50", "Alerta por acumulación de traslados pendientes."));
        }
        if (!repository.existsById("MIN_MONTHS_FOR_TRANSFER")) {
            repository.save(new SystemParameter("MIN_MONTHS_FOR_TRANSFER", "24", "Tiempo mínimo en cargo (meses) para autorizar traslado."));
        }
        if (!repository.existsById("MAX_ROTATION_PERCENTAGE")) {
            repository.save(new SystemParameter("MAX_ROTATION_PERCENTAGE", "15", "Porcentaje máximo de rotación mensual permitida por unidad."));
        }
        if (!repository.existsById("RETRAINING_ALERT_DAYS")) {
            repository.save(new SystemParameter("RETRAINING_ALERT_DAYS", "30", "Días previos a vencerse curso de combate para alerta."));
        }
    }

    @GetMapping
    public ResponseEntity<Map<String, String>> getAllParameters() {
        Map<String, String> params = repository.findAll().stream()
                .collect(Collectors.toMap(SystemParameter::getParameterKey, SystemParameter::getParameterValue));
        return ResponseEntity.ok(params);
    }

    @PutMapping
    @PreAuthorize("hasRole('EJERCITO') or hasRole('ADMINISTRATOR')")
    public ResponseEntity<?> updateParameters(@RequestBody Map<String, String> newParams) {
        for (Map.Entry<String, String> entry : newParams.entrySet()) {
            repository.findById(entry.getKey()).ifPresent(param -> {
                param.setParameterValue(entry.getValue());
                repository.save(param);
            });
        }
        return ResponseEntity.ok().build();
    }
}
