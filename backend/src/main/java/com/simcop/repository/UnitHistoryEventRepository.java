package com.simcop.repository;

import com.simcop.model.UnitHistoryEvent;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface UnitHistoryEventRepository extends JpaRepository<UnitHistoryEvent, String> {
    java.util.List<UnitHistoryEvent> findByUnitId(String unitId);
}
