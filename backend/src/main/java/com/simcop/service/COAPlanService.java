package com.simcop.service;

import com.simcop.model.COAPlan;
import com.simcop.repository.COAPlanRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Service
public class COAPlanService {

    @Autowired
    private COAPlanRepository repository;

    public List<COAPlan> getAllActive() {
        return repository.findByHiddenTimestampIsNullOrderByCreatedTimestampDesc();
    }

    public List<COAPlan> getActiveByUser(String userId) {
        if (userId == null)
            return List.of();
        return repository.findByCreatedByUserIdAndHiddenTimestampIsNull(userId);
    }

    public Optional<COAPlan> getById(String id) {
        if (id == null)
            return Optional.empty();
        return repository.findById(id);
    }

    public COAPlan create(COAPlan plan) {
        if (plan.getCreatedTimestamp() == null) {
            plan.setCreatedTimestamp(LocalDateTime.now());
        }
        return repository.save(plan);
    }

    public COAPlan update(COAPlan plan) {
        if (plan == null)
            throw new IllegalArgumentException("Plan cannot be null");
        return repository.save(plan);
    }

    public void softDelete(String id) {
        if (id == null)
            return;
        Optional<COAPlan> planOpt = repository.findById(id);
        if (planOpt.isPresent()) {
            COAPlan plan = planOpt.get();
            plan.setHiddenTimestamp(LocalDateTime.now());
            repository.save(plan);
        }
    }

    public void hardDelete(String id) {
        if (id == null)
            return;
        repository.deleteById(id);
    }
}
