package com.simcop.service;

import com.simcop.model.OperationalGraphic;
import com.simcop.repository.OperationalGraphicRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Service
public class OperationalGraphicService {

    @Autowired
    private OperationalGraphicRepository repository;

    public List<OperationalGraphic> getAllActive() {
        return repository.findByHiddenTimestampIsNull();
    }

    public List<OperationalGraphic> getActiveByPlantilla(String plantillaType) {
        return repository.findByPlantillaTypeAndHiddenTimestampIsNull(plantillaType);
    }

    public OperationalGraphic create(OperationalGraphic graphic) {
        if (graphic.getCreatedTimestamp() == null) {
            graphic.setCreatedTimestamp(LocalDateTime.now());
        }
        return repository.save(graphic);
    }

    public void softDelete(String id) {
        if (id == null)
            return;
        Optional<OperationalGraphic> graphicOpt = repository.findById(id);
        if (graphicOpt.isPresent()) {
            OperationalGraphic graphic = graphicOpt.get();
            graphic.setHiddenTimestamp(LocalDateTime.now());
            repository.save(graphic);
        }
    }

    public void hardDelete(String id) {
        if (id == null)
            return;
        repository.deleteById(id);
    }
}
